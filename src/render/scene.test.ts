/* START
 * Unit tests for scene.ts: build a real Board, serialize it, and confirm
 * the emitted draw ops — then apply each camera mutation (pan, zoom,
 * rotate) and confirm the scene renders as expected: shifted points,
 * scaled points, flipped draw order and side faces. Also covers piece
 * state rendering (rotation, face-down, lift), stacks (bottom-up draw
 * order, a lifted piece floating over a tall stack, topmost-piece picking),
 * pickPiece hit testing (full-silhouette: side faces of 3D bodies are
 * clickable), non-rectangular outlines (hexagon sides, image clip, hit
 * testing), 3D objects (prism side/top polygons with shaded colors,
 * physical heights when cards stack on cubes), and resolveDrag (the
 * height-aware drag: stays on a support while overlapping, reads the board
 * plane when clear, undefined over inconsistent slivers).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Board } from "../board/board.js";
import { Card } from "../card/card.js";
import { hexagonOutline, Outline } from "../component/component.js";
import { polygonImage, solidImage } from "../image/create.js";
import { Image } from "../image/image.js";
import { GameObject, Prism } from "../object/object.js";
import { Camera, fitCamera, pan, project, rotateAbout, zoomAbout } from "./camera.js";
import { buildScene, ImageOp, pickPiece, PolygonOp, resolveDrag, SceneOp } from "./scene.js";
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

test("a lifted piece floats at the lift's base height and is drawn on top", () => {
  const ops = buildScene(BOARD, CAM, { pieceIds: [1], bottomMm: 20 });
  assert.deepEqual(
    imageOps(ops).map((op) => op.url),
    ["/pieces/2/front.png", "/pieces/1/front.png"],
  );
  assertClose(imageOps(ops)[1].origin, project(CAM, 45, 45, 20 + Z_TOP));
});

// A 200x100mm board with a 10-piece stack at (50, 50) (ids 1-10, z 0-9)
// and a lone piece 11 at (150, 50).
function makeStackBoard(): BoardDto {
  const board = new Board(200, 100);
  for (let i = 0; i < 10; i++) board.place(new TestCard(), 50, 50);
  board.place(new TestCard(), 150, 50);
  return boardToDto(board);
}

test("a stack is drawn bottom-up, lower layers everywhere first", () => {
  const ops = buildScene(makeStackBoard(), CAM);
  const urls = imageOps(ops).map((op) => op.url);
  assert.equal(urls.length, 11);
  // z 0 back-to-front (stack bottom, then the nearer lone piece), then the
  // stack's remaining layers in z order.
  assert.equal(urls[0], "/pieces/1/front.png");
  assert.equal(urls[1], "/pieces/11/front.png");
  assert.equal(urls[10], "/pieces/10/front.png");
  // The stack's top face sits 10 thicknesses up.
  assertClose(imageOps(ops)[10].origin, project(CAM, 45, 45, 10 * 0.3));
});

test("a piece dragged past a tall stack floats over it, never through it", () => {
  const board = makeStackBoard();
  // Piece 11 (z 0) dragged directly over the 10-piece stack.
  board.pieces[10].xMm = 50;
  board.pieces[10].yMm = 50;
  const ops = buildScene(board, CAM, { pieceIds: [11], bottomMm: 20 });
  const urls = imageOps(ops).map((op) => op.url);
  // Painted after every stack piece (over it), and physically above the
  // stack's 3mm top: floating at 20mm.
  assert.equal(urls[10], "/pieces/11/front.png");
  assertClose(imageOps(ops)[10].origin, project(CAM, 45, 45, 20 + 0.3));
});

test("clicking a stack picks the topmost piece", () => {
  const board = makeStackBoard();
  const topMm = 10 * 0.3;
  assert.equal(pickPiece(board, CAM, ...project(CAM, 50, 50, topMm))?.id, 10);
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
  // Piece 1's x-side polygon now shows the face at x0 = 45. Sides are
  // emitted in outline-edge order, so the -y side (ops[4]) comes before
  // this -x side (ops[5], edge d -> a).
  assert.equal(ops[5].kind, "polygon");
  const sideX = (ops[5] as { points: [number, number][] }).points;
  assertClose(sideX[0], project(cam, 45, 55, Z_TOP));
  assertClose(sideX[1], project(cam, 45, 45, Z_TOP));
  assertClose(sideX[2], project(cam, 45, 45, 0));
  assertClose(sideX[3], project(cam, 45, 55, 0));
});

class HexTestCard extends Card {
  readonly widthMm = 95;
  readonly heightMm = 83;
  readonly front: Image = polygonImage(950, 830, this.outlinePx(), { r: 200, g: 60, b: 60, a: 255 });
  readonly back: Image = polygonImage(950, 830, this.outlinePx(), { r: 60, g: 60, b: 200, a: 255 });

  override outlineMm(): Outline {
    return hexagonOutline(this.widthMm, this.heightMm);
  }
}

// A 200x100mm board with one hexagonal piece centered at (100, 50).
function makeHexBoard(): BoardDto {
  const board = new Board(200, 100);
  board.place(new HexTestCard(), 100, 50);
  return boardToDto(board);
}

test("a hexagonal piece renders its camera-facing sides and face image", () => {
  const ops = buildScene(makeHexBoard(), CAM);
  // Board polygon + 3 of the hexagon's 6 sides face the default camera + image.
  assert.equal(ops.length, 1 + 3 + 1);
  // The image quad spans the full bounding box; the bitmap itself is
  // hexagonal (transparent outside the outline), so no clipping is needed.
  const op = imageOps(ops)[0];
  assertClose(op.origin, project(CAM, 100 - 47.5, 50 - 41.5, Z_TOP));
});

test("pickPiece tests against the hexagonal outline, not the bounding box", () => {
  const board = makeHexBoard();
  // Near the left vertex: inside the hexagon.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54, 50, Z_TOP))?.id, 1);
  // Inside the bounding box but outside the hexagon's top-left slope.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54, 10, Z_TOP)), undefined);
});

const CUBE_COLOR = { r: 100, g: 150, b: 200, a: 255 };

// A 200x100mm board with an 8mm cube at (50, 50).
function makeCubeBoard(): BoardDto {
  const board = new Board(200, 100);
  board.place(new GameObject({ color: CUBE_COLOR }), 50, 50);
  return boardToDto(board);
}

function polygonOps(ops: SceneOp[]): PolygonOp[] {
  return ops.filter((op) => op.kind === "polygon");
}

test("a cube renders two shaded sides and a colored top face", () => {
  const ops = buildScene(makeCubeBoard(), CAM);
  // Board polygon + 2 camera-facing sides + the top face; no image ops.
  assert.equal(ops.length, 4);
  assert.ok(ops.every((op) => op.kind === "polygon"));
  const [, sideX, sideY, top] = polygonOps(ops);
  assert.equal(sideX.color, "rgb(80, 120, 160)"); // color * 0.8
  assert.equal(sideY.color, "rgb(65, 98, 130)"); // color * 0.65
  assert.equal(top.color, "rgb(100, 150, 200)");
  // The top face spans the cube's 8x8mm footprint at its 8mm height.
  assertClose(top.points[0], project(CAM, 46, 46, 8));
  assertClose(top.points[2], project(CAM, 54, 54, 8));
  // The +x side runs from the top edge down to the board.
  assertClose(sideX.points[0], project(CAM, 54, 46, 8));
  assertClose(sideX.points[2], project(CAM, 54, 54, 0));
});

test("a multi-prism object draws its prisms bottom-up", () => {
  class Tower extends GameObject {
    constructor() {
      super({ heightMm: 16, color: CUBE_COLOR });
    }

    override shapeMm(): Prism[] {
      const cap: Outline = [
        [-2, -2],
        [2, -2],
        [2, 2],
        [-2, 2],
      ];
      return [
        { outlineMm: this.outlineMm(), bottomMm: 0, topMm: 8 },
        { outlineMm: cap, bottomMm: 8, topMm: 16 },
      ];
    }
  }
  const board = new Board(200, 100);
  board.place(new Tower(), 50, 50);
  const ops = buildScene(boardToDto(board), CAM);
  // Board + (2 sides + top) per prism.
  assert.equal(ops.length, 7);
  const tops = polygonOps(ops).filter((op) => op.color === "rgb(100, 150, 200)");
  assertClose(tops[0].points[0], project(CAM, 46, 46, 8));
  assertClose(tops[1].points[0], project(CAM, 48, 48, 16));
});

test("a card stacked on a cube renders and picks at the cube's height", () => {
  const board = new Board(200, 100);
  board.place(new GameObject({ color: CUBE_COLOR }), 50, 50);
  board.place(new TestCard(), 50, 50);
  const dto = boardToDto(board);
  const ops = buildScene(dto, CAM);
  // The card's face sits on top of the 8mm cube, not at card height.
  assertClose(imageOps(ops)[0].origin, project(CAM, 45, 45, 8 + 0.3));
  assert.equal(pickPiece(dto, CAM, ...project(CAM, 50, 50, 8 + 0.3))?.id, 2);
});

test("pickPiece hits a piece's side faces, not just its top", () => {
  const board = makeCubeBoard();
  // Points on the cube's +x and +y side faces at mid-height.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54, 50, 4))?.id, 1);
  assert.equal(pickPiece(board, CAM, ...project(CAM, 50, 54, 4))?.id, 1);
  // In the air above the cube's top face: nothing.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 50, 50, 20)), undefined);
});

// A 200x100mm board with cube 1 at (50, 50) and cube 2 stacked on it.
function makeCubeStackBoard(): BoardDto {
  const board = new Board(200, 100);
  board.place(new GameObject({ color: CUBE_COLOR }), 50, 50);
  board.place(new GameObject({ color: CUBE_COLOR }), 50, 50);
  return boardToDto(board);
}

test("pickPiece on a stacked cube's side picks that cube", () => {
  const board = makeCubeStackBoard();
  // The +x side faces of the top (z 8..16) and bottom (z 0..8) cubes.
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54, 50, 12))?.id, 2);
  assert.equal(pickPiece(board, CAM, ...project(CAM, 54, 50, 4))?.id, 1);
});

// Dragging the stacked top cube, grabbed at its top-face center.
function dragTopCube(board: BoardDto) {
  return { piece: board.pieces[1], carriedIds: [2], grabXMm: 0, grabYMm: 0 };
}

test("resolveDrag keeps a cube dragged partway down another cube on top of it", () => {
  const board = makeCubeStackBoard();
  // The cursor over the bottom cube: read on its 8mm top, still overlapping.
  const res = resolveDrag(board, CAM, ...project(CAM, 53, 53, 16), dragTopCube(board));
  assert.equal(res?.supportMm, 8);
  assertClose([res!.xMm, res!.yMm], [53, 53]);
});

test("resolveDrag reads the cursor on the board plane once the footprint is clear", () => {
  const board = makeCubeStackBoard();
  const res = resolveDrag(board, CAM, ...project(CAM, 70, 70, 16), dragTopCube(board));
  // The same screen point on the 8mm-lower plane sits 8mm further in view
  // direction: the piece lands where it appears, never inside the cube.
  assert.equal(res?.supportMm, 0);
  assertClose([res!.xMm, res!.yMm], [62, 62]);
});

test("resolveDrag is undefined over a physically inconsistent sliver", () => {
  const board = makeCubeStackBoard();
  // Past the cube's edge on its top plane, but overlapping it on the board
  // plane: no consistent resting spot — the caller keeps the last position.
  assert.equal(resolveDrag(board, CAM, ...project(CAM, 59, 59, 16), dragTopCube(board)), undefined);
});

test("a lifted stack keeps its inner heights above the lift base", () => {
  const board = new Board(200, 100);
  board.place(new GameObject({ color: CUBE_COLOR }), 50, 50);
  board.place(new TestCard(), 50, 50);
  const ops = buildScene(boardToDto(board), CAM, { pieceIds: [1, 2], bottomMm: 20 });
  // The carried card rides on the floating cube: 20 + 8mm up.
  assertClose(imageOps(ops)[0].origin, project(CAM, 45, 45, 20 + 8 + 0.3));
});
