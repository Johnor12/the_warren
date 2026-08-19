/* START
 * Browser entry point: a thin shell over camera.ts + scene.ts. Fetches the
 * board, loads face images, applies mouse input, and rasterizes the scene
 * ops onto <canvas id="board">.
 * - main(): fetch /board.json, preload images, wire controls, draw;
 *   redraws on resize and on camera/piece changes.
 * - setupControls(): the gesture state machine. On a piece: left-drag moves
 *   it (lifted above the board while moving), right-drag rotates it, double
 *   click / double right click POST to the server, which runs the card's
 *   overridable handlers (flip / snap-rotate 45°). On empty board: left-drag
 *   pans, right-drag rotates the view, mouse wheel zooms about the cursor.
 *   Drag results are committed to the server on mouseup.
 * - render() and helpers: clear to the table color, then draw each SceneOp
 *   (polygon fill, or face image via a canvas transform).
 * END */

import { Camera, fitCamera, pan, rotateAbout, unproject, zoomAbout } from "./camera.js";
import { buildScene, ImageOp, Lift, pickPiece, pieceTopMm, SceneOp } from "./scene.js";
import { BoardDto, PieceDto, PieceStateDto } from "./types.js";

const TABLE_COLOR = "#1e242b";
const ZOOM_RATE = 0.001; // zoom factor exponent per wheel delta unit
const ROTATE_RATE = 0.01; // camera: radians of yaw per px of horizontal drag
const SPIN_RATE = 0.5; // piece: degrees per px of horizontal drag
const LIFT_MM = 20; // how high a card rises while being moved
const CLICK_PX = 5; // max cursor travel for a press to count as a click
const DOUBLE_MS = 400; // max delay between the two clicks of a double click

interface Ctx {
  board: BoardDto;
  cam: Camera;
  lift: Lift | null;
  canvas: HTMLCanvasElement;
  images: Map<string, HTMLImageElement>;
}

async function main(): Promise<void> {
  const board: BoardDto = await (await fetch("/board.json")).json();
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    board.pieces
      .flatMap((piece) => [piece.frontUrl, piece.backUrl])
      .map(async (url) => {
        images.set(url, await loadImage(url));
      }),
  );
  const canvas = document.getElementById("board") as HTMLCanvasElement;
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  const ctx: Ctx = {
    board,
    cam: fitCamera(board, canvas.width, canvas.height),
    lift: null,
    canvas,
    images,
  };
  setupControls(ctx);
  window.addEventListener("resize", () => {
    resize();
    draw(ctx);
  });
  draw(ctx);
}

function draw(ctx: Ctx): void {
  render(ctx.canvas, buildScene(ctx.board, ctx.cam, ctx.lift ?? undefined), ctx.images);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

type Gesture =
  | { kind: "pan" }
  | { kind: "orbit" }
  | { kind: "move"; piece: PieceDto; grabXMm: number; grabYMm: number }
  | { kind: "spin"; piece: PieceDto };

function setupControls(ctx: Ctx): void {
  const canvas = ctx.canvas;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  let gesture: Gesture | null = null;
  let button = 0;
  let startX = 0; // mousedown position, for the click-vs-drag threshold
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false; // true once the cursor leaves the click threshold
  let lastClick: { button: number; pieceId: number; time: number } | null = null;

  canvas.addEventListener("mousedown", (e) => {
    if (gesture || (e.button !== 0 && e.button !== 2)) return;
    button = e.button;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    dragging = false;
    const piece = pickPiece(ctx.board, ctx.cam, e.clientX, e.clientY);
    if (!piece) {
      gesture = { kind: button === 0 ? "pan" : "orbit" };
    } else if (button === 0) {
      const [wx, wy] = unproject(ctx.cam, e.clientX, e.clientY, pieceTopMm(piece));
      gesture = { kind: "move", piece, grabXMm: wx - piece.xMm, grabYMm: wy - piece.yMm };
    } else {
      gesture = { kind: "spin", piece };
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!gesture) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < CLICK_PX) return;
      dragging = true;
      if (gesture.kind === "move") {
        ctx.lift = { pieceId: gesture.piece.id, liftMm: LIFT_MM };
      }
    }
    if (gesture.kind === "pan") {
      ctx.cam = pan(ctx.cam, dx, dy);
    } else if (gesture.kind === "orbit") {
      ctx.cam = rotateAbout(ctx.cam, canvas.width / 2, canvas.height / 2, dx * ROTATE_RATE);
    } else if (gesture.kind === "move") {
      // The cursor drags the piece's footprint; the lift is visual only.
      const [wx, wy] = unproject(ctx.cam, e.clientX, e.clientY, pieceTopMm(gesture.piece));
      gesture.piece.xMm = clamp(wx - gesture.grabXMm, 0, ctx.board.widthMm);
      gesture.piece.yMm = clamp(wy - gesture.grabYMm, 0, ctx.board.heightMm);
    } else {
      gesture.piece.rotationDeg += dx * SPIN_RATE;
    }
    draw(ctx);
  });

  window.addEventListener("mouseup", (e) => {
    if (!gesture || e.button !== button) return;
    const done = gesture;
    gesture = null;
    if (done.kind === "pan" || done.kind === "orbit") return;
    if (!dragging) {
      handleClick(done.piece);
    } else if (done.kind === "move") {
      ctx.lift = null;
      draw(ctx);
      commit(done.piece, "move", { xMm: done.piece.xMm, yMm: done.piece.yMm });
    } else {
      commit(done.piece, "rotate", { rotationDeg: done.piece.rotationDeg });
    }
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      ctx.cam = zoomAbout(ctx.cam, e.clientX, e.clientY, Math.exp(-e.deltaY * ZOOM_RATE));
      draw(ctx);
    },
    { passive: false },
  );

  function handleClick(piece: PieceDto): void {
    const now = performance.now();
    const isDouble =
      lastClick !== null &&
      lastClick.button === button &&
      lastClick.pieceId === piece.id &&
      now - lastClick.time < DOUBLE_MS;
    lastClick = isDouble ? null : { button, pieceId: piece.id, time: now };
    if (!isDouble) return;
    commit(piece, button === 0 ? "double-click" : "double-right-click");
  }

  // POST a piece action; the server responds with the authoritative piece
  // state (double-click actions run the card's overridable handlers there).
  async function commit(piece: PieceDto, action: string, body?: unknown): Promise<void> {
    const res = await fetch(`/pieces/${piece.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${action} failed: ${res.status}`);
    const state: PieceStateDto = await res.json();
    Object.assign(piece, state);
    draw(ctx);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

// Face bitmaps map to the card shape (transparent outside the outline), so
// the whole bitmap is drawn onto the projected top face with no clipping.
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
