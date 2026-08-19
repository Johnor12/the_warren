/* START
 * Unit tests for scene.ts: build a real Board, serialize it, and confirm
 * the emitted draw ops — then apply each camera mutation (pan, zoom,
 * rotate) and confirm the scene renders as expected: shifted points,
 * scaled points, flipped draw order and side faces. Also covers piece
 * state rendering (rotation, face-down, lift) and pickPiece hit testing.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Board } from "../board/board.js";
import { Card } from "../card/card.js";
import { solidImage } from "../image/create.js";
import { Image } from "../image/image.js";
import { Camera, fitCamera, pan, project, rotateAbout, zoomAbout } from "./camera.js";
import { buildScene, ImageOp, pickPiece, SceneOp } from "./scene.js";
import { boardToDto } from "./serialize.js";
import { BoardDto } from "./types.js";

class TestCard extends Card {
  readonly widthMm = 10;
  readonly heightMm = 10;
  readonly front: Image = solidImage(100, 100, { r: 200, g: 60, b: 60, a: 255 });
  readonly back: Image = solidImage(100, 100, { r: 60, g: 60, b: 200, a: 255 });
}

// A 200x100mm board with piece 1 at (50, 50) and piece 2 at (150, 50).
function makeBoard(): BoardDto {
  const board = new Board(200, 100);
  board.place(new TestCard(), 50, 50);
  board.place(new TestCard(), 150, 50);
  return boardToDto(board);
}

const BOARD = makeBoard();
const CAM = fitCamera(BOARD, 1280, 720);
const CENTER = project(CAM, 100, 50, 0); // screen position of the board center
const Z_TOP = 0.3; // card thickness; pieces sit at zIndex 0

function assertClose(actual: [number, number], expected: [number, number]): void {
  for (const i of [0, 1] as const) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) < 1e-9,
      `[${actual}] != [${expected}]`,
    );
  }
}

function allPoints(ops: SceneOp[]): [number, number][] {
  return ops.flatMap((op) =>
    op.kind === "polygon" ? op.points : [op.origin, op.xCorner, op.yCorner],
  );
}

function imageOps(ops: SceneOp[]): ImageOp[] {
  return ops.filter((op) => op.kind === "image");
}

test("scene is the board polygon plus 3 ops per piece, back-to-front", () => {
  const ops = buildScene(BOARD, CAM);
  assert.equal(ops.length, 1 + 3 * BOARD.pieces.length);
  assert.equal(ops[0].kind, "polygon");
  assertClose((ops[0] as { points: [number, number][] }).points[0], project(CAM, 0, 0, 0));
  assertClose(
    (ops[0] as { points: [number, number][] }).points[2],
    project(CAM, 200, 100, 0),
  );
  // Piece 1 (50, 50) is farther from the camera than piece 2 (150, 50).
  assert.deepEqual(
    imageOps(ops).map((op) => op.url),
    ["/pieces/1/front.png", "/pieces/2/front.png"],
  );
});

test("a piece's image op spans its projected top face", () => {
  const op = imageOps(buildScene(BOARD, CAM))[0];
  assertClose(op.origin, project(CAM, 45, 45, Z_TOP));
  assertClose(op.xCorner, project(CAM, 55, 45, Z_TOP));
  assertClose(op.yCorner, project(CAM, 45, 55, Z_TOP));
});

test("pan shifts every rendered point by the drag delta", () => {
  const before = allPoints(buildScene(BOARD, CAM));
  const after = allPoints(buildScene(BOARD, pan(CAM, 25, -10)));
  before.forEach(([x, y], i) => assertClose(after[i], [x + 25, y - 10]));
});

test("zoom scales every rendered point about the cursor", () => {
  const [cx, cy] = CENTER;
  const before = allPoints(buildScene(BOARD, CAM));
  const after = allPoints(buildScene(BOARD, zoomAbout(CAM, cx, cy, 2)));
  before.forEach(([x, y], i) => {
    assertClose(after[i], [cx + 2 * (x - cx), cy + 2 * (y - cy)]);
  });
});

test("a rotated piece's image op spans its rotated top face", () => {
  const board = makeBoard();
  board.pieces[0].rotationDeg = 90;
  const op = imageOps(buildScene(board, CAM))[0];
  assertClose(op.origin, project(CAM, 55, 45, Z_TOP));
  assertClose(op.xCorner, project(CAM, 55, 55, Z_TOP));
  assertClose(op.yCorner, project(CAM, 45, 45, Z_TOP));
});

test("a face-down piece renders its back image", () => {
  const board = makeBoard();
  board.pieces[1].faceUp = false;
  assert.deepEqual(
    imageOps(buildScene(board, CAM)).map((op) => op.url),
    ["/pieces/1/front.png", "/pieces/2/back.png"],
  );
});

test("a lifted piece rises by liftMm and is drawn on top", () => {
  const ops = buildScene(BOARD, CAM, { pieceId: 1, liftMm: 20 });
  assert.deepEqual(
    imageOps(ops).map((op) => op.url),
    ["/pieces/2/front.png", "/pieces/1/front.png"],
  );
  assertClose(imageOps(ops)[1].origin, project(CAM, 45, 45, 20 + Z_TOP));
});

test("pickPiece finds the piece under a screen point", () => {
  assert.equal(pickPiece(BOARD, CAM, ...project(CAM, 50, 50, Z_TOP))?.id, 1);
  assert.equal(pickPiece(BOARD, CAM, ...project(CAM, 152, 48, Z_TOP))?.id, 2);
  assert.equal(pickPiece(BOARD, CAM, ...project(CAM, 100, 20, Z_TOP)), undefined);
});

test("pickPiece tests against the rotated footprint", () => {
  const board = makeBoard();
  board.pieces[0].rotationDeg = 45;
  // (56, 50) is outside the unrotated 10x10 footprint but inside the
  // rotated one; (54.5, 54.5) is the opposite.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 56, 50, Z_TOP))?.id, 1);
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54.5, 54.5, Z_TOP)), undefined);
});

test("rotating a half turn flips draw order and the visible faces", () => {
  const cam = rotateAbout(CAM, ...CENTER, Math.PI);
  const ops = buildScene(BOARD, cam);
  // Piece 2 is now behind piece 1.
  assert.deepEqual(
    imageOps(ops).map((op) => op.url),
    ["/pieces/2/front.png", "/pieces/1/front.png"],
  );
  // Board corner (0, 0) now projects where corner (200, 100) did.
  assertClose(project(cam, 0, 0, 0), project(CAM, 200, 100, 0));
  // Piece 1's x-side polygon (ops[4]) now shows the face at x0 = 45.
  assert.equal(ops[4].kind, "polygon");
  const sideX = (ops[4] as { points: [number, number][] }).points;
  assertClose(sideX[0], project(cam, 45, 45, Z_TOP));
  assertClose(sideX[1], project(cam, 45, 55, Z_TOP));
  assertClose(sideX[2], project(cam, 45, 55, 0));
  assertClose(sideX[3], project(cam, 45, 45, 0));
});
