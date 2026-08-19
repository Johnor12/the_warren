/* START
 * Pure scene construction: turns a BoardDto + Camera into an ordered list
 * of 2D draw ops, so rendering is unit-testable without a browser.
 * - PolygonOp / ImageOp / SceneOp: a color-filled screen polygon, or a
 *   piece face image with the projected top-face corners (origin = image
 *   pixel (0,0), xCorner = (width,0), yCorner = (0,height)).
 * - Lift: a piece temporarily raised above the board (while being dragged).
 * - buildScene(board, cam, lift?): board surface polygon, then each piece
 *   back-to-front (painter's algorithm, lifted piece on top) as its
 *   camera-facing side polygons plus its visible-face image op, honoring
 *   each piece's rotation and faceUp state.
 * - pickPiece(board, cam, sx, sy): topmost piece under a screen point.
 * - pieceTopMm(piece): height of a piece's top face above the board.
 * END */

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
  pieceId: number;
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
    ops.push(...pieceOps(piece, cam, lift && piece.id === lift.pieceId ? lift.liftMm : 0));
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
    return Math.abs(lx) <= piece.widthMm / 2 && Math.abs(ly) <= piece.heightMm / 2;
  });
}

// Painter's algorithm: the lifted piece last (it hovers above everything),
// otherwise lower stacks first, then back-to-front in view space.
function paintOrder(pieces: PieceDto[], cam: Camera, lift?: Lift): PieceDto[] {
  const cos = Math.cos(cam.yaw);
  const sin = Math.sin(cam.yaw);
  const depth = (p: PieceDto) => p.xMm * (cos + sin) + p.yMm * (cos - sin);
  const lifted = (p: PieceDto) => (p.id === lift?.pieceId ? 1 : 0);
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
  const corner = (lx: number, ly: number): [number, number] => [
    piece.xMm + lx * cos - ly * sin,
    piece.yMm + lx * sin + ly * cos,
  ];
  const w = piece.widthMm / 2;
  const h = piece.heightMm / 2;
  const a = corner(-w, -h); // image pixel (0, 0)
  const b = corner(w, -h); // image pixel (width, 0)
  const c = corner(w, h);
  const d = corner(-w, h); // image pixel (0, height)

  // The four side faces; those whose outward normal points towards the
  // camera (view direction v, in world coordinates) are visible.
  const vx = Math.cos(cam.yaw) + Math.sin(cam.yaw);
  const vy = Math.cos(cam.yaw) - Math.sin(cam.yaw);
  const sides = [
    { from: b, to: c, normal: [cos, sin], color: SIDE_COLOR_X },
    { from: a, to: d, normal: [-cos, -sin], color: SIDE_COLOR_X },
    { from: d, to: c, normal: [-sin, cos], color: SIDE_COLOR_Y },
    { from: a, to: b, normal: [sin, -cos], color: SIDE_COLOR_Y },
  ];
  const ops: SceneOp[] = [];
  for (const { from, to, normal, color } of sides) {
    if (normal[0] * vx + normal[1] * vy <= 0) continue;
    ops.push({
      kind: "polygon",
      color,
      points: [
        project(cam, from[0], from[1], zTop),
        project(cam, to[0], to[1], zTop),
        project(cam, to[0], to[1], zBottom),
        project(cam, from[0], from[1], zBottom),
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
