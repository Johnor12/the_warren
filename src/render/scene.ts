/* START
 * Pure scene construction: turns a BoardDto + Camera into an ordered list
 * of 2D draw ops, so rendering is unit-testable without a browser.
 * - PolygonOp / ImageOp / SceneOp: a color-filled screen polygon, or a
 *   piece face image with the projected top-face corners (origin = image
 *   pixel (0,0), xCorner = (width,0), yCorner = (0,height)). Face bitmaps
 *   map to the card shape (transparent outside the outline), so image ops
 *   need no clipping.
 * - Lift: pieces raised above the board (the stack being dragged), floating
 *   at an explicit base height; carried pieces keep their in-stack heights.
 * - buildScene(board, cam, lift?): board surface polygon, then each piece
 *   back-to-front (painter's algorithm: z-index, then view depth, lifted
 *   pieces on top). Physical heights come from stackBottoms (thicknesses
 *   vary — a card on an 8mm cube renders at 8mm). Cards draw their
 *   camera-facing outline-edge side polygons plus the visible-face image
 *   op; objects draw each prism bottom-up as shaded side polygons plus a
 *   top polygon in the surface color. Both honor rotation.
 * - pickPiece(board, cam, sx, sy): topmost piece under a screen point,
 *   testing the piece's full projected silhouette (top, bottom, and side
 *   faces of its outline extrusion), so clicking a 3D body works.
 * - resolveDrag(board, cam, sx, sy, spec): height-aware drag: reads the
 *   ambiguous isometric cursor against each candidate support height
 *   (board or a settled piece's top) and returns the highest physically
 *   consistent position — so a piece released over another's body lands
 *   on top of it; undefined over inconsistent slivers (keep the last).
 * - pieceTopMm(pieces, piece): height of a piece's top face above the board.
 * END */

import { piecesOverlap, stackBottoms } from "../board/stacking.js";
import { pointInPolygon, Polygon } from "../geometry/polygon.js";
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

export interface Lift {
  pieceIds: number[]; // the dragged piece and everything stacked on it
  bottomMm: number; // height of the dragged stack's base while floating
}

// Height of the piece's top face above the board, given every piece on it
// (stacked pieces rest on the tallest overlapped top below them).
export function pieceTopMm(pieces: PieceDto[], piece: PieceDto): number {
  return stackBottoms(pieces).get(piece)! + piece.thicknessMm;
}

export function buildScene(board: BoardDto, cam: Camera, lift?: Lift): SceneOp[] {
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
  // The lifted stack is airborne: it doesn't rest on (or support) settled
  // pieces. Carried pieces keep their heights within the stack itself.
  const liftedIds = new Set(lift?.pieceIds ?? []);
  const bottoms = stackBottoms(board.pieces.filter((p) => !liftedIds.has(p.id)));
  const innerBottoms = stackBottoms(board.pieces.filter((p) => liftedIds.has(p.id)));
  for (const piece of paintOrder(board.pieces, cam, lift)) {
    const bottomMm = liftedIds.has(piece.id)
      ? lift!.bottomMm + innerBottoms.get(piece)!
      : bottoms.get(piece)!;
    ops.push(...pieceOps(piece, cam, bottomMm));
  }
  return ops;
}

// Topmost piece whose projected silhouette contains screen point (sx, sy).
export function pickPiece(
  board: BoardDto,
  cam: Camera,
  sx: number,
  sy: number,
): PieceDto | undefined {
  const bottoms = stackBottoms(board.pieces);
  return [...paintOrder(board.pieces, cam)]
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
// stack moves with it, so it can't rest on any of its members) and the
// cursor's grab offset from the piece center on its top face.
export interface DragSpec {
  piece: PieceDto;
  carriedIds: number[];
  grabXMm: number;
  grabYMm: number;
}

// Interpret the cursor for a dragged piece. A screen point is ambiguous in
// isometric projection (near-and-low vs far-and-high); read it against each
// candidate support height — the board, or a settled piece's top — and keep
// the highest physically consistent one: the piece's footprint there
// actually rests on that support. So a piece released over another's body
// lands on top of it, never inside it. Undefined when no candidate is
// consistent (the cursor sits over a piece's lower edge): keep the last
// resolved position.
export function resolveDrag(
  board: BoardDto,
  cam: Camera,
  sx: number,
  sy: number,
  spec: DragSpec,
): { xMm: number; yMm: number; supportMm: number } | undefined {
  const carried = new Set(spec.carriedIds);
  const settled = board.pieces.filter((p) => !carried.has(p.id));
  const bottoms = stackBottoms(settled);
  const tops = settled.map((p) => bottoms.get(p)! + p.thicknessMm);
  const candidates = [...new Set([0, ...tops])].sort((a, b) => b - a);
  for (const supportMm of candidates) {
    const [wx, wy] = unproject(cam, sx, sy, supportMm + spec.piece.thicknessMm);
    const xMm = clamp(wx - spec.grabXMm, 0, board.widthMm);
    const yMm = clamp(wy - spec.grabYMm, 0, board.heightMm);
    const candidate = { ...spec.piece, xMm, yMm };
    const restsOn = settled
      .filter((p) => piecesOverlap(candidate, p))
      .reduce((top, p) => Math.max(top, bottoms.get(p)! + p.thicknessMm), 0);
    if (Math.abs(restsOn - supportMm) < 1e-9) return { xMm, yMm, supportMm };
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Painter's algorithm: the lifted stack last (it hovers above everything),
// otherwise lower stacks first, then back-to-front in view space.
function paintOrder(pieces: PieceDto[], cam: Camera, lift?: Lift): PieceDto[] {
  const cos = Math.cos(cam.yaw);
  const sin = Math.sin(cam.yaw);
  const depth = (p: PieceDto) => p.xMm * (cos + sin) + p.yMm * (cos - sin);
  const lifted = (p: PieceDto) => (lift?.pieceIds.includes(p.id) ? 1 : 0);
  return [...pieces].sort(
    (a, b) => lifted(a) - lifted(b) || a.zIndex - b.zIndex || depth(a) - depth(b),
  );
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
