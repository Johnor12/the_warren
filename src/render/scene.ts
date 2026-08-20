/* START
 * Pure scene construction: turns a BoardDto + Camera into an ordered list
 * of 2D draw ops, so rendering is unit-testable without a browser.
 * - PolygonOp / ImageOp / SceneOp: a color-filled screen polygon, or a
 *   piece face image with the projected top-face corners (origin = image
 *   pixel (0,0), xCorner = (width,0), yCorner = (0,height)). Face bitmaps
 *   map to the card shape (transparent outside the outline), so image ops
 *   need no clipping.
 * - Lift: pieces temporarily raised above the board (the stack being
 *   dragged), so they float over anything they pass, however tall.
 * - buildScene(board, cam, lift?): board surface polygon, then each piece
 *   back-to-front (painter's algorithm: z-index, then view depth, lifted
 *   pieces on top) as its camera-facing outline-edge side polygons plus its
 *   visible-face image op, honoring each piece's rotation and faceUp state.
 * - pickPiece(board, cam, sx, sy): topmost piece under a screen point
 *   (point-in-outline-polygon test).
 * - pieceTopMm(piece): height of a piece's top face above the board.
 * END */

import { pointInPolygon } from "../geometry/polygon.js";
import { Camera, project, unproject } from "./camera.js";
import { BoardDto, PieceDto } from "./types.js";

const BOARD_COLOR = "#37654b";
const SIDE_COLOR_X = "#b9b9b9"; // faces with a local x-axis normal
const SIDE_COLOR_Y = "#9c9c9c"; // faces with a local y-axis normal

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
  liftMm: number;
}

export function pieceTopMm(piece: PieceDto): number {
  return (piece.zIndex + 1) * piece.thicknessMm;
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
  for (const piece of paintOrder(board.pieces, cam, lift)) {
    ops.push(...pieceOps(piece, cam, lift?.pieceIds.includes(piece.id) ? lift.liftMm : 0));
  }
  return ops;
}

// Topmost piece whose top face contains screen point (sx, sy), or undefined.
export function pickPiece(
  board: BoardDto,
  cam: Camera,
  sx: number,
  sy: number,
): PieceDto | undefined {
  return [...paintOrder(board.pieces, cam)].reverse().find((piece) => {
    const [wx, wy] = unproject(cam, sx, sy, pieceTopMm(piece));
    const rad = (piece.rotationDeg * Math.PI) / 180;
    const dx = wx - piece.xMm;
    const dy = wy - piece.yMm;
    // Into piece-local coordinates: rotate by -rad about the center.
    const lx = dx * Math.cos(rad) + dy * Math.sin(rad);
    const ly = -dx * Math.sin(rad) + dy * Math.cos(rad);
    return pointInPolygon(lx, ly, piece.outlineMm);
  });
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

function pieceOps(piece: PieceDto, cam: Camera, liftMm: number): SceneOp[] {
  const zBottom = piece.zIndex * piece.thicknessMm + liftMm;
  const zTop = zBottom + piece.thicknessMm;
  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const toWorld = ([lx, ly]: [number, number]): [number, number] => [
    piece.xMm + lx * cos - ly * sin,
    piece.yMm + lx * sin + ly * cos,
  ];
  const w = piece.widthMm / 2;
  const h = piece.heightMm / 2;
  const a = toWorld([-w, -h]); // image pixel (0, 0)
  const b = toWorld([w, -h]); // image pixel (width, 0)
  const d = toWorld([-w, h]); // image pixel (0, height)
  const outline = piece.outlineMm;
  const world = outline.map(toWorld);

  // One side face per outline edge; those whose outward normal points
  // towards the camera (view direction v, in world coordinates) are visible.
  // Mostly-x-facing sides are lighter than mostly-y-facing ones.
  const vx = Math.cos(cam.yaw) + Math.sin(cam.yaw);
  const vy = Math.cos(cam.yaw) - Math.sin(cam.yaw);
  const ops: SceneOp[] = [];
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const ldx = outline[j][0] - outline[i][0];
    const ldy = outline[j][1] - outline[i][1];
    // Local outward normal (ldy, -ldx), rotated into world coordinates.
    const nx = ldy * cos + ldx * sin;
    const ny = ldy * sin - ldx * cos;
    if (nx * vx + ny * vy <= 0) continue;
    ops.push({
      kind: "polygon",
      color: Math.abs(ldy) >= Math.abs(ldx) ? SIDE_COLOR_X : SIDE_COLOR_Y,
      points: [
        project(cam, world[i][0], world[i][1], zTop),
        project(cam, world[j][0], world[j][1], zTop),
        project(cam, world[j][0], world[j][1], zBottom),
        project(cam, world[i][0], world[i][1], zBottom),
      ],
    });
  }
  ops.push({
    kind: "image",
    url: piece.faceUp ? piece.frontUrl : piece.backUrl,
    origin: project(cam, a[0], a[1], zTop),
    xCorner: project(cam, b[0], b[1], zTop),
    yCorner: project(cam, d[0], d[1], zTop),
  });
  return ops;
}
