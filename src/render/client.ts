/* START
 * Browser entry point: a thin shell over camera.ts + scene.ts. Fetches the
 * board, loads face images, applies mouse input as pure camera mutations,
 * and rasterizes the scene ops onto <canvas id="board">.
 * - main(): fetch /board.json, preload images, wire controls, draw;
 *   redraws on resize and on camera changes.
 * - setupControls(): left-drag pans, mouse wheel zooms about the cursor,
 *   right-drag left/right rotates the view around the screen center.
 * - render() and helpers: clear to the table color, then draw each SceneOp
 *   (polygon fill, or face image via a canvas transform).
 * END */

import { Camera, fitCamera, pan, rotateAbout, zoomAbout } from "./camera.js";
import { buildScene, ImageOp, SceneOp } from "./scene.js";
import { BoardDto } from "./types.js";

const TABLE_COLOR = "#1e242b";
const ZOOM_RATE = 0.001; // zoom factor exponent per wheel delta unit
const ROTATE_RATE = 0.01; // radians of yaw per px of horizontal drag

async function main(): Promise<void> {
  const board: BoardDto = await (await fetch("/board.json")).json();
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    board.pieces.map(async (piece) => {
      images.set(piece.frontUrl, await loadImage(piece.frontUrl));
    }),
  );
  const canvas = document.getElementById("board") as HTMLCanvasElement;
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  let cam = fitCamera(board, canvas.width, canvas.height);
  const draw = () => render(canvas, buildScene(board, cam), images);
  setupControls(canvas, (mutate) => {
    cam = mutate(cam);
    draw();
  });
  window.addEventListener("resize", () => {
    resize();
    draw();
  });
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

function setupControls(
  canvas: HTMLCanvasElement,
  apply: (mutate: (cam: Camera) => Camera) => void,
): void {
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  let dragging: "pan" | "rotate" | null = null;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("mousedown", (e) => {
    dragging = e.button === 0 ? "pan" : e.button === 2 ? "rotate" : null;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => {
    dragging = null;
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (dragging === "pan") {
      apply((cam) => pan(cam, dx, dy));
    } else {
      apply((cam) => rotateAbout(cam, canvas.width / 2, canvas.height / 2, dx * ROTATE_RATE));
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      apply((cam) => zoomAbout(cam, e.clientX, e.clientY, Math.exp(-e.deltaY * ZOOM_RATE)));
    },
    { passive: false },
  );
}

function render(
  canvas: HTMLCanvasElement,
  ops: SceneOp[],
  images: Map<string, HTMLImageElement>,
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = TABLE_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const op of ops) {
    if (op.kind === "polygon") fillPolygon(ctx, op.color, op.points);
    else drawImageOp(ctx, op, images.get(op.url)!);
  }
}

function drawImageOp(ctx: CanvasRenderingContext2D, op: ImageOp, image: HTMLImageElement): void {
  const [ex, ey] = op.origin;
  ctx.setTransform(
    (op.xCorner[0] - ex) / image.width,
    (op.xCorner[1] - ey) / image.width,
    (op.yCorner[0] - ex) / image.height,
    (op.yCorner[1] - ey) / image.height,
    ex,
    ey,
  );
  ctx.drawImage(image, 0, 0);
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
