/* START
 * Pure scene construction: turns a BoardDto + Camera into an ordered list
 * of 2D draw ops, so rendering is unit-testable without a browser.
 * - PolygonOp / ImageOp / SceneOp: a color-filled screen polygon, or a
 *   piece face image with the projected top-face corners (origin = image
 *   pixel (0,0), xCorner = (width,0), yCorner = (0,height)).
 * - buildScene(board, cam): board surface polygon, then each piece
 *   back-to-front (painter's algorithm) as its two camera-facing side
 *   polygons plus its top-face image op.
 * END */

import { Camera, project } from "./camera.js";
import { BoardDto, PieceDto } from "./types.js";

const BOARD_COLOR = "#37654b";
const SIDE_COLOR_X = "#b9b9b9"; // faces with an x-axis normal
const SIDE_COLOR_Y = "#9c9c9c"; // faces with a y-axis normal

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

export function buildScene(board: BoardDto, cam: Camera): SceneOp[] {
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
  // Painter's algorithm: lower stacks first, then back-to-front in view space.
  const cos = Math.cos(cam.yaw);
  const sin = Math.sin(cam.yaw);
  const depth = (p: PieceDto) => p.xMm * (cos + sin) + p.yMm * (cos - sin);
  const pieces = [...board.pieces].sort(
    (a, b) => a.zIndex - b.zIndex || depth(a) - depth(b),
  );
  for (const piece of pieces) ops.push(...pieceOps(piece, cam));
  return ops;
}

function pieceOps(piece: PieceDto, cam: Camera): SceneOp[] {
  const x0 = piece.xMm - piece.widthMm / 2;
  const y0 = piece.yMm - piece.heightMm / 2;
  const x1 = x0 + piece.widthMm;
  const y1 = y0 + piece.heightMm;
  const zBottom = piece.zIndex * piece.thicknessMm;
  const zTop = zBottom + piece.thicknessMm;

  // The two side faces whose outward normals point towards the camera.
  const vx = Math.cos(cam.yaw) + Math.sin(cam.yaw); // view direction, world x
  const vy = Math.cos(cam.yaw) - Math.sin(cam.yaw); // view direction, world y
  const sideX = vx > 0 ? x1 : x0;
  const sideY = vy > 0 ? y1 : y0;
  return [
    {
      kind: "polygon",
      color: SIDE_COLOR_X,
      points: [
        project(cam, sideX, y0, zTop),
        project(cam, sideX, y1, zTop),
        project(cam, sideX, y1, zBottom),
        project(cam, sideX, y0, zBottom),
      ],
    },
    {
      kind: "polygon",
      color: SIDE_COLOR_Y,
      points: [
        project(cam, x0, sideY, zTop),
        project(cam, x1, sideY, zTop),
        project(cam, x1, sideY, zBottom),
        project(cam, x0, sideY, zBottom),
      ],
    },
    {
      kind: "image",
      url: piece.frontUrl,
      origin: project(cam, x0, y0, zTop),
      xCorner: project(cam, x1, y0, zTop),
      yCorner: project(cam, x0, y1, zTop),
    },
  ];
}
