/* START
 * Unit tests for the Board's core piece manipulation: initial piece state,
 * movePiece clamping to the board bounds, rotatePiece normalization, and
 * lookup of unknown ids.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Card } from "../card/card.js";
import { solidImage } from "../image/create.js";
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
