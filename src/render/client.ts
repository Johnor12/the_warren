/* START
 * Browser entry point: renders the board isometrically on the page's
 * <canvas id="board">, redrawing on window resize.
 * - main(): fetch /board.json, load each piece's front image, draw.
 * - fitCamera() / project(): fixed isometric camera (30 degree axes);
 *   world mm -> screen px, scaled so the whole board fits the canvas.
 * - drawScene() and helpers: board surface as a filled diamond, then each
 *   piece back-to-front as a box: two shaded side faces plus its front
 *   image mapped onto the top face with a canvas transform.
 * END */

import { BoardDto, PieceDto } from "./types.js";

// Screen direction of the world axes: +x runs down-right, +y down-left, +z up.
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const MARGIN_PX = 40;

const TABLE_COLOR = "#1e242b";
const BOARD_COLOR = "#37654b";
const SIDE_COLOR_X = "#b9b9b9"; // face towards +x
const SIDE_COLOR_Y = "#9c9c9c"; // face towards +y

interface Camera {
  s: number; // screen px per world mm
  offsetX: number;
  offsetY: number;
}

async function main(): Promise<void> {
  const board: BoardDto = await (await fetch("/board.json")).json();
  const images = new Map<number, HTMLImageElement>();
  await Promise.all(
    board.pieces.map(async (piece) => {
      images.set(piece.id, await loadImage(piece.frontUrl));
    }),
  );
  const draw = () => drawScene(board, images);
  window.addEventListener("resize", draw);
  draw();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

function fitCamera(board: BoardDto, canvas: HTMLCanvasElement): Camera {
  const isoW = (board.widthMm + board.heightMm) * COS;
  const isoH = (board.widthMm + board.heightMm) * SIN;
  const s = Math.min(
    (canvas.width - 2 * MARGIN_PX) / isoW,
    (canvas.height - 2 * MARGIN_PX) / isoH,
  );
  return {
    s,
    offsetX: (canvas.width - (board.widthMm - board.heightMm) * COS * s) / 2,
    offsetY: (canvas.height - isoH * s) / 2,
  };
}

function project(cam: Camera, xMm: number, yMm: number, zMm: number): [number, number] {
  return [
    cam.offsetX + (xMm - yMm) * COS * cam.s,
    cam.offsetY + (xMm + yMm) * SIN * cam.s - zMm * cam.s,
  ];
}

function drawScene(board: BoardDto, images: Map<number, HTMLImageElement>): void {
  const canvas = document.getElementById("board") as HTMLCanvasElement;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d")!;
  const cam = fitCamera(board, canvas);

  ctx.fillStyle = TABLE_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  fillPolygon(ctx, BOARD_COLOR, [
    project(cam, 0, 0, 0),
    project(cam, board.widthMm, 0, 0),
    project(cam, board.widthMm, board.heightMm, 0),
    project(cam, 0, board.heightMm, 0),
  ]);

  // Painter's algorithm: lower stacks first, then back-to-front.
  const pieces = [...board.pieces].sort(
    (a, b) => a.zIndex - b.zIndex || a.xMm + a.yMm - (b.xMm + b.yMm),
  );
  for (const piece of pieces) {
    drawPiece(ctx, cam, piece, images.get(piece.id)!);
  }
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  piece: PieceDto,
  face: HTMLImageElement,
): void {
  const x0 = piece.xMm - piece.widthMm / 2;
  const y0 = piece.yMm - piece.heightMm / 2;
  const x1 = x0 + piece.widthMm;
  const y1 = y0 + piece.heightMm;
  const zBottom = piece.zIndex * piece.thicknessMm;
  const zTop = zBottom + piece.thicknessMm;

  // The two camera-facing side faces (towards +x and +y).
  fillPolygon(ctx, SIDE_COLOR_X, [
    project(cam, x1, y0, zTop),
    project(cam, x1, y1, zTop),
    project(cam, x1, y1, zBottom),
    project(cam, x1, y0, zBottom),
  ]);
  fillPolygon(ctx, SIDE_COLOR_Y, [
    project(cam, x0, y1, zTop),
    project(cam, x1, y1, zTop),
    project(cam, x1, y1, zBottom),
    project(cam, x0, y1, zBottom),
  ]);

  // Top face: transform image pixel space onto the isometric plane.
  const [ex, ey] = project(cam, x0, y0, zTop);
  const mmPerPxX = piece.widthMm / face.width;
  const mmPerPxY = piece.heightMm / face.height;
  ctx.setTransform(
    COS * cam.s * mmPerPxX,
    SIN * cam.s * mmPerPxX,
    -COS * cam.s * mmPerPxY,
    SIN * cam.s * mmPerPxY,
    ex,
    ey,
  );
  ctx.drawImage(face, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function fillPolygon(
  ctx: CanvasRenderingContext2D,
  color: string,
  points: [number, number][],
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

main();
