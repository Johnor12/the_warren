/* START
 * Unit tests for the Board's core piece manipulation: initial piece state,
 * movePiece clamping to the board bounds, rotatePiece normalization,
 * lookup of unknown ids, and stacking (placement arrival order, moves
 * carrying the pieces stacked on top, z re-resolution on drop, dropping
 * onto a tall stack, and rotation leaving z-indexes alone).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Card } from "../card/card.js";
import { solidImage } from "../image/create.js";
import { GameObject } from "../object/object.js";
import { Board } from "./board.js";

class PlainCard extends Card {
  readonly widthMm = 10;
  readonly heightMm = 10;
  readonly front = solidImage(100, 100, { r: 200, g: 60, b: 60, a: 255 });
  readonly back = solidImage(100, 100, { r: 60, g: 60, b: 200, a: 255 });
}

function makeBoard(): Board {
  const board = new Board(200, 100);
  board.place(new PlainCard(), 50, 50);
  return board;
}

test("placed pieces start face up and unrotated", () => {
  const piece = makeBoard().piece(1)!;
  assert.equal(piece.faceUp, true);
  assert.equal(piece.rotationDeg, 0);
  assert.equal(piece.zIndex, 0);
});

test("movePiece moves the piece, clamped to the board", () => {
  const board = makeBoard();
  board.movePiece(1, 120, 80);
  assert.deepEqual([board.piece(1)!.xMm, board.piece(1)!.yMm], [120, 80]);
  board.movePiece(1, -5, 999);
  assert.deepEqual([board.piece(1)!.xMm, board.piece(1)!.yMm], [0, 100]);
});

test("rotatePiece normalizes the angle into [0, 360)", () => {
  const board = makeBoard();
  assert.equal(board.rotatePiece(1, 370).rotationDeg, 10);
  assert.equal(board.rotatePiece(1, -90).rotationDeg, 270);
});

test("unknown piece ids: piece() is undefined, mutations throw", () => {
  const board = makeBoard();
  assert.equal(board.piece(99), undefined);
  assert.throws(() => board.movePiece(99, 0, 0), /no piece/);
});

function zOf(board: Board, ...ids: number[]): number[] {
  return ids.map((id) => board.piece(id)!.zIndex);
}

test("pieces placed on the same spot stack in arrival order", () => {
  const board = new Board(200, 100);
  for (let i = 0; i < 10; i++) board.place(new PlainCard(), 50, 50);
  assert.deepEqual(zOf(board, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("a partial overlap stacks; a clear placement does not", () => {
  const board = makeBoard();
  board.place(new PlainCard(), 55, 55); // overlaps piece 1's corner
  board.place(new PlainCard(), 150, 50); // clear
  assert.deepEqual(zOf(board, 1, 2, 3), [0, 1, 0]);
});

test("moving a card onto another stacks it on top", () => {
  const board = makeBoard();
  board.place(new PlainCard(), 150, 50);
  board.movePiece(2, 52, 50);
  assert.deepEqual(zOf(board, 1, 2), [0, 1]);
});

test("moving a card onto a 10-card stack lands on top of the stack", () => {
  const board = new Board(200, 100);
  for (let i = 0; i < 10; i++) board.place(new PlainCard(), 50, 50);
  const mover = board.place(new PlainCard(), 150, 50);
  board.movePiece(mover.id, 50, 50);
  assert.equal(mover.zIndex, 10);
  // The stack underneath is untouched.
  assert.deepEqual(zOf(board, 1, 10), [0, 9]);
});

test("moving a lower card carries everything stacked on top of it", () => {
  const board = makeBoard();
  board.place(new PlainCard(), 55, 50); // z 1, on piece 1
  board.place(new PlainCard(), 60, 50); // z 2, on piece 2 (and clear of 1)
  board.movePiece(1, 150, 50);
  // Offsets preserved, whole stack moved, z order kept.
  assert.deepEqual(zOf(board, 1, 2, 3), [0, 1, 2]);
  assert.deepEqual(
    board.pieces.map((p) => p.xMm),
    [150, 155, 160],
  );
});

test("moving a mid-stack card carries only the cards above it and re-bases them", () => {
  const board = makeBoard();
  board.place(new PlainCard(), 55, 50); // z 1
  board.place(new PlainCard(), 60, 50); // z 2
  board.movePiece(2, 150, 50);
  // Piece 1 stays; pieces 2 and 3 land on empty board re-based to z 0 and 1.
  assert.deepEqual(zOf(board, 1, 2, 3), [0, 0, 1]);
  assert.deepEqual(
    board.pieces.map((p) => p.xMm),
    [50, 150, 155],
  );
});

test("pulling the top card off a stack rests it on the board", () => {
  const board = new Board(200, 100);
  board.place(new PlainCard(), 50, 50);
  board.place(new PlainCard(), 50, 50);
  board.movePiece(2, 150, 50);
  assert.deepEqual(zOf(board, 1, 2), [0, 0]);
});

test("objects stack with cards under the same rules", () => {
  const board = new Board(200, 100);
  board.place(new GameObject(), 50, 50); // 8mm cube, z 0
  board.place(new PlainCard(), 52, 50); // overlaps the cube -> z 1
  const cube = board.place(new GameObject(), 150, 50);
  board.movePiece(cube.id, 50, 50); // dropped onto the stack -> z 2
  assert.deepEqual(zOf(board, 1, 2, 3), [0, 1, 2]);
  // Thicknesses are cached per piece for physical stack heights.
  assert.deepEqual(
    board.pieces.map((p) => p.thicknessMm),
    [8, 0.3, 8],
  );
});

test("a card resting on a tiered object's low tier moves with the object", () => {
  class Tower extends GameObject {
    constructor() {
      super({ lengthMm: 20, widthMm: 20, heightMm: 30 });
    }

    override shapeMm() {
      return [
        { outlineMm: this.outlineMm(), bottomMm: 0, topMm: 18 },
        { outlineMm: [[-3, -3], [3, -3], [3, 3], [-3, 3]] as [number, number][], bottomMm: 18, topMm: 30 },
      ];
    }
  }
  const board = new Board(200, 100);
  board.place(new Tower(), 50, 50);
  board.place(new PlainCard(), 38, 50); // rests on the 18mm base tier
  board.movePiece(1, 60, 50);
  // The card is physically supported by the tier, so it is carried along.
  assert.deepEqual(board.pieces.map((p) => p.xMm), [60, 48]);
});

test("rotating and flipping never restack", () => {
  const board = new Board(200, 100);
  board.place(new PlainCard(), 50, 50);
  board.place(new PlainCard(), 50, 50);
  board.rotatePiece(1, 45); // bottom card of the stack
  assert.deepEqual(zOf(board, 1, 2), [0, 1]);
});
