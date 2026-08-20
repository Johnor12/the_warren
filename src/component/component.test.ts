/* START
 * Unit tests for the Component base class: the default double-right-click
 * 45° snap rotation (advance from a stop, align to the nearest stop from
 * between stops, wrap at 360°), the default no-op double click, outline
 * validation (< 3 points rejected), and normalizeDeg.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Component, normalizeDeg, Outline, PieceState, rectangleOutline } from "./component.js";

class Token extends Component {
  readonly thicknessMm = 5;

  outlineMm(): Outline {
    return rectangleOutline(10, 10);
  }
}

function pieceAt(rotationDeg: number): PieceState {
  return { xMm: 0, yMm: 0, rotationDeg, faceUp: true };
}

test("double click does nothing by default", () => {
  const piece = pieceAt(30);
  new Token().onDoubleClick(piece);
  assert.deepEqual(piece, pieceAt(30));
});

test("double right click rotates 45° from a stop", () => {
  const token = new Token();
  for (const [from, to] of [
    [0, 45],
    [45, 90],
    [315, 0], // wraps around
  ]) {
    const piece = pieceAt(from);
    token.onDoubleRightClick(piece);
    assert.equal(piece.rotationDeg, to, `from ${from}°`);
  }
});

test("double right click between stops aligns with the nearest stop", () => {
  const token = new Token();
  for (const [from, to] of [
    [30, 45],
    [100, 90],
    [350, 0], // nearest stop is 360°, normalized to 0°
  ]) {
    const piece = pieceAt(from);
    token.onDoubleRightClick(piece);
    assert.equal(piece.rotationDeg, to, `from ${from}°`);
  }
});

test("assertValid rejects an outline with fewer than 3 points", () => {
  class Sliver extends Token {
    override outlineMm(): Outline {
      return [
        [0, 0],
        [1, 1],
      ];
    }
  }
  assert.throws(() => new Sliver().assertValid(), /need >= 3/);
  assert.doesNotThrow(() => new Token().assertValid());
});

test("normalizeDeg maps any angle into [0, 360)", () => {
  assert.equal(normalizeDeg(370), 10);
  assert.equal(normalizeDeg(-90), 270);
  assert.equal(normalizeDeg(360), 0);
});
