/* START
 * Pure scene construction: turns a BoardDto + Camera into an ordered list
 * of 2D draw ops, so rendering is unit-testable without a browser.
 * - PolygonOp / ImageOp / SceneOp: a color-filled screen polygon, or a
 *   piece face image with the projected top-face corners (origin = image
 *   pixel (0,0), xCorner = (width,0), yCorner = (0,height)). Face bitmaps
 *   map to the card shape (transparent outside the outline), so image ops
 *   need no clipping.
 * - Drag: the stack being dragged (dragged piece + carried pieces), with
 *   the height each member would land at right now (landingBottoms); the
 *   stack is rendered at exactly its drop pose — a carried piece over a
 *   taller settled piece is shown resting on it, out of the stack.
 * - buildScene(board, cam, drag?): board surface polygon, then each piece
 *   back-to-front (paintOrder: a physical occlusion sort — overlapping
 *   footprints draw bottom-up, disjoint ones far-to-near along the view
 *   direction). Physical heights come from stackBottoms (shape-aware —
 *   a card on an 8mm cube renders at 8mm, on a tiered object at the top
 *   of the tier under it). Cards draw their camera-facing outline-edge
 *   side polygons plus the visible-face image op; objects draw each prism
 *   bottom-up as shaded side polygons plus a top polygon in the surface
 *   color. Both honor rotation.
 * - pickPiece(board, cam, sx, sy): frontmost piece under a screen point,
 *   testing the piece's full projected silhouette (top, bottom, and side
 *   faces of its outline extrusion), so clicking a 3D body works.
 * - resolveDrag(board, cam, sx, sy, spec): reads the cursor on the fixed
 *   plane the piece was grabbed on (1:1 screen-to-world motion, no jumps)
 *   and returns the position plus each stack member's landing height there.
 * - pieceTopMm(pieces, piece): height of a piece's top face above the board.
 * END */

import { footprint, landingBottoms, stackBottoms } from "../board/stacking.js";
import { convexHull, pointInPolygon, Polygon, polygonsOverlap } from "../geometry/polygon.js";
import { Camera, project, unproject } from "./camera.js";
import { BoardDto, ObjectDto, PieceDto } from "./types.js";

const BOARD_COLOR = "#37654b";
const SIDE_COLOR_X = "#b9b9b9"; // card faces with a local x-axis normal
const SIDE_COLOR_Y = "#9c9c9c"; // card faces with a local y-axis normal
const SIDE_SHADE_X = 0.8; // object side shading relative to the surface color
const SIDE_SHADE_Y = 0.65;

export interface PolygonOp {
  kind: "polygon";
  color: string;
  points: [number, number][];
}

export interface ImageOp {
  kind: "image";
  url: string;
  origin: [number, number]; // screen position of image pixel (0, 0)
  xCorner: [number, number]; // of image pixel (width, 0)
  yCorner: [number, number]; // of image pixel (0, height)
}

export type SceneOp = PolygonOp | ImageOp;

export interface Drag {
  // pieceId -> the height that stack member would land at if dropped right
  // now (resolveDrag), covering the dragged piece and everything carried.
  bottomsMm: Map<number, number>;
}

// Height of the piece's top face above the board, given every piece on it
// (stacked pieces rest on the tallest overlapped top below them).
export function pieceTopMm(pieces: PieceDto[], piece: PieceDto): number {
  return stackBottoms(pieces).get(piece)! + piece.thicknessMm;
}

export function buildScene(board: BoardDto, cam: Camera, drag?: Drag): SceneOp[] {
  const ops: SceneOp[] = [
    {
      kind: "polygon",
      color: BOARD_COLOR,
      points: [
        project(cam, 0, 0, 0),
        project(cam, board.widthMm, 0, 0),
        project(cam, board.widthMm, board.heightMm, 0),
        project(cam, 0, board.heightMm, 0),
      ],
    },
  ];
  // The dragged stack is in motion: it doesn't rest on (or support) settled
  // pieces. Each dragged piece renders at the height it would land at if
  // dropped right now, so the drop frame matches the preview exactly.
  const dragBottoms = drag?.bottomsMm ?? new Map<number, number>();
  const settledBottoms = stackBottoms(board.pieces.filter((p) => !dragBottoms.has(p.id)));
  const bottoms = new Map<PieceDto, number>();
  for (const piece of board.pieces) {
    bottoms.set(piece, dragBottoms.get(piece.id) ?? settledBottoms.get(piece)!);
  }
  for (const piece of paintOrder(board.pieces, cam, bottoms)) {
    ops.push(...pieceOps(piece, cam, bottoms.get(piece)!));
  }
  return ops;
}

// Frontmost piece whose projected silhouette contains screen point (sx, sy).
export function pickPiece(
  board: BoardDto,
  cam: Camera,
  sx: number,
  sy: number,
): PieceDto | undefined {
  const bottoms = stackBottoms(board.pieces);
  return [...paintOrder(board.pieces, cam, bottoms)]
    .reverse()
    .find((piece) =>
      silhouette(piece, cam, bottoms.get(piece)!).some((poly) => pointInPolygon(sx, sy, poly)),
    );
}

// The piece's projected screen-space silhouette: the top and bottom faces
// of its outline extrusion plus every side face (visible or not — cheap,
// and safe for non-convex outlines).
function silhouette(piece: PieceDto, cam: Camera, bottomMm: number): Polygon[] {
  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const at = (zMm: number) =>
    piece.outlineMm.map(([lx, ly]) =>
      project(cam, piece.xMm + lx * cos - ly * sin, piece.yMm + lx * sin + ly * cos, zMm),
    );
  const top = at(bottomMm + piece.thicknessMm);
  const bottom = at(bottomMm);
  const sides = top.map((point, i): Polygon => {
    const j = (i + 1) % top.length;
    return [point, top[j], bottom[j], bottom[i]];
  });
  return [top, bottom, ...sides];
}

// What a drag gesture needs resolved: the piece being dragged (the carried
// stack moves with it, so it can't rest on any of its members), the
// cursor's grab offset from the piece center on its top face, and the
// height of the plane the piece was grabbed on (its top face at grab time).
export interface DragSpec {
  piece: PieceDto;
  carriedIds: number[];
  grabXMm: number;
  grabYMm: number;
  grabZMm: number;
}

// Interpret the cursor for a dragged stack: read it on the fixed horizontal
// plane the piece was grabbed on, so cursor motion maps 1:1 to world motion
// — the landing height never feeds back into the position, which is what
// kept the old drag sticking and jumping at piece edges. bottomsMm is where
// each stack member would land if dropped at that position (landingBottoms):
// the stack is rendered, and dropped, at exactly those heights — a carried
// piece over a taller settled piece is shown resting on it.
export function resolveDrag(
  board: BoardDto,
  cam: Camera,
  sx: number,
  sy: number,
  spec: DragSpec,
): { xMm: number; yMm: number; bottomsMm: Map<number, number> } {
  const [wx, wy] = unproject(cam, sx, sy, spec.grabZMm);
  const xMm = clamp(wx - spec.grabXMm, 0, board.widthMm);
  const yMm = clamp(wy - spec.grabYMm, 0, board.heightMm);
  const carried = new Set(spec.carriedIds);
  const settled = board.pieces.filter((p) => !carried.has(p.id));
  // The stack moves rigidly, so every member shares the base piece's delta.
  const dx = xMm - spec.piece.xMm;
  const dy = yMm - spec.piece.yMm;
  const moving = board.pieces
    .filter((p) => carried.has(p.id))
    .map((p) => ({ ...p, xMm: p.xMm + dx, yMm: p.yMm + dy }));
  const landing = landingBottoms(settled, moving);
  return { xMm, yMm, bottomsMm: new Map(moving.map((p) => [p.id, landing.get(p)!])) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Painter's algorithm as a physical occlusion sort. Two pieces constrain
// each other only if their bodies can overlap on screen (bounding-box
// prescreen): pieces whose footprints share area stack vertically, so the
// lower one draws first; for disjoint footprints, the far one draws first —
// "far" meaning sweeping its footprint along the view direction runs into
// the other's (z-indexes order pieces within a stack, so they say nothing
// about occlusion between stacks). A topological sort seeded far-to-near
// applies the constraints; cycles (interlocking concave outlines) fall
// back to seed order.
const SWEEP_MM = 1e4; // sweep length: far beyond any board
function paintOrder(
  pieces: PieceDto[],
  cam: Camera,
  bottoms: Map<PieceDto, number>,
): PieceDto[] {
  const vx = Math.cos(cam.yaw) + Math.sin(cam.yaw); // view direction, world
  const vy = Math.cos(cam.yaw) - Math.sin(cam.yaw);
  const depth = (p: PieceDto) => p.xMm * vx + p.yMm * vy;
  const seed = [...pieces].sort(
    (a, b) => depth(a) - depth(b) || bottoms.get(a)! - bottoms.get(b)! || a.zIndex - b.zIndex,
  );
  const feet = seed.map(footprint);
  const sweeps = feet.map((foot) =>
    convexHull([...foot, ...foot.map(([x, y]): [number, number] => [x + vx * SWEEP_MM, y + vy * SWEEP_MM])]),
  );
  const boxes = seed.map((p, i) => screenBox(feet[i], cam, bottoms.get(p)!, p.thicknessMm));
  const before: number[][] = seed.map(() => []);
  for (let i = 0; i < seed.length; i++) {
    for (let j = i + 1; j < seed.length; j++) {
      if (!boxesOverlap(boxes[i], boxes[j])) continue;
      if (polygonsOverlap(feet[i], feet[j])) {
        const cmp =
          bottoms.get(seed[i])! - bottoms.get(seed[j])! || seed[i].zIndex - seed[j].zIndex;
        if (cmp < 0) before[j].push(i);
        else if (cmp > 0) before[i].push(j);
      } else if (polygonsOverlap(sweeps[i], feet[j])) {
        before[j].push(i); // j blocks i's line to the camera: i is behind
      } else if (polygonsOverlap(sweeps[j], feet[i])) {
        before[i].push(j);
      }
    }
  }
  const state = seed.map(() => 0); // 0 unvisited, 1 visiting, 2 done
  const order: PieceDto[] = [];
  const visit = (i: number): void => {
    if (state[i]) return;
    state[i] = 1;
    for (const b of before[i]) if (state[b] !== 1) visit(b);
    state[i] = 2;
    order.push(seed[i]);
  };
  for (let i = 0; i < seed.length; i++) visit(i);
  return order;
}

// Screen-space bounding box of a piece's body (footprint at its bottom and
// top heights), for the can-these-overlap-on-screen prescreen.
function screenBox(
  foot: Polygon,
  cam: Camera,
  bottomMm: number,
  thicknessMm: number,
): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of foot) {
    for (const z of [bottomMm, bottomMm + thicknessMm]) {
      const [sx, sy] = project(cam, x, y, z);
      minX = Math.min(minX, sx);
      minY = Math.min(minY, sy);
      maxX = Math.max(maxX, sx);
      maxY = Math.max(maxY, sy);
    }
  }
  return [minX, minY, maxX, maxY];
}

function boxesOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

function pieceOps(piece: PieceDto, cam: Camera, bottomMm: number): SceneOp[] {
  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = ([lx, ly]: [number, number]): [number, number] => [
    piece.xMm + lx * cos - ly * sin,
    piece.yMm + lx * sin + ly * cos,
  ];
  if (piece.kind === "object") return objectOps(piece, cam, toWorld, bottomMm);

  const zTop = bottomMm + piece.thicknessMm;
  const ops: SceneOp[] = sideOps(
    piece.outlineMm,
    toWorld,
    cam,
    bottomMm,
    zTop,
    SIDE_COLOR_X,
    SIDE_COLOR_Y,
  );
  const w = piece.widthMm / 2;
  const h = piece.heightMm / 2;
  ops.push({
    kind: "image",
    url: piece.faceUp ? piece.frontUrl : piece.backUrl,
    origin: project(cam, ...toWorld([-w, -h]), zTop), // image pixel (0, 0)
    xCorner: project(cam, ...toWorld([w, -h]), zTop), // (width, 0)
    yCorner: project(cam, ...toWorld([-w, h]), zTop), // (0, height)
  });
  return ops;
}

// Each prism bottom-up: shaded camera-facing sides, then the top face in
// the surface color.
function objectOps(
  piece: ObjectDto,
  cam: Camera,
  toWorld: (p: [number, number]) => [number, number],
  bottomMm: number,
): SceneOp[] {
  const ops: SceneOp[] = [];
  for (const prism of [...piece.prisms].sort((a, b) => a.bottomMm - b.bottomMm)) {
    const zBottom = bottomMm + prism.bottomMm;
    const zTop = bottomMm + prism.topMm;
    ops.push(
      ...sideOps(
        prism.outlineMm,
        toWorld,
        cam,
        zBottom,
        zTop,
        shade(piece.color, SIDE_SHADE_X),
        shade(piece.color, SIDE_SHADE_Y),
      ),
      {
        kind: "polygon",
        color: shade(piece.color, 1),
        points: prism.outlineMm.map((p) => project(cam, ...toWorld(p), zTop)),
      },
    );
  }
  return ops;
}

// One side face per outline edge; those whose outward normal points towards
// the camera (view direction v, in world coordinates) are visible. Sides
// with a mostly-local-x normal get colorX, mostly-local-y get colorY.
function sideOps(
  outline: Polygon,
  toWorld: (p: [number, number]) => [number, number],
  cam: Camera,
  zBottom: number,
  zTop: number,
  colorX: string,
  colorY: string,
): PolygonOp[] {
  const world = outline.map(toWorld);
  const vx = Math.cos(cam.yaw) + Math.sin(cam.yaw);
  const vy = Math.cos(cam.yaw) - Math.sin(cam.yaw);
  const ops: PolygonOp[] = [];
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const ldx = outline[j][0] - outline[i][0];
    const ldy = outline[j][1] - outline[i][1];
    // World outward normal (wdy, -wdx), from the world-space edge delta.
    const wdx = world[j][0] - world[i][0];
    const wdy = world[j][1] - world[i][1];
    if (wdy * vx - wdx * vy <= 0) continue;
    ops.push({
      kind: "polygon",
      color: Math.abs(ldy) >= Math.abs(ldx) ? colorX : colorY,
      points: [
        project(cam, world[i][0], world[i][1], zTop),
        project(cam, world[j][0], world[j][1], zTop),
        project(cam, world[j][0], world[j][1], zBottom),
        project(cam, world[i][0], world[i][1], zBottom),
      ],
    });
  }
  return ops;
}

function shade(color: { r: number; g: number; b: number }, factor: number): string {
  const c = (v: number) => Math.round(v * factor);
  return `rgb(${c(color.r)}, ${c(color.g)}, ${c(color.b)})`;
}
