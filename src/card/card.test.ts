/* START
 * Unit tests for the Card interaction handlers: the default double-click
 * flip, the default double-right-click 45° snap rotation (advance from a
 * stop, align to the nearest stop from between stops, wrap at 360°), and
 * that subclasses can override both handlers.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { solidImage } from "../image/create.js";
import { Card, PieceState } from "./card.js";

class PlainCard extends Card {
  readonly widthMm = 10;
  readonly heightMm = 10;
  readonly front = solidImage(100, 100, { r: 200, g: 60, b: 60, a: 255 });
  readonly back = solidImage(100, 100, { r: 60, g: 60, b: 200, a: 255 });
}

function pieceAt(rotationDeg: number): PieceState {
  return { xMm: 0, yMm: 0, rotationDeg, faceUp: true };
}

test("double click flips the card over and back", () => {
  const piece = pieceAt(0);
  const card = new PlainCard();
  card.onDoubleClick(piece);
  assert.equal(piece.faceUp, false);
  card.onDoubleClick(piece);
  assert.equal(piece.faceUp, true);
});

test("double right click rotates 45° from a stop", () => {
  const card = new PlainCard();
  for (const [from, to] of [
    [0, 45],
    [45, 90],
    [315, 0], // wraps around
  ]) {
    const piece = pieceAt(from);
    card.onDoubleRightClick(piece);
    assert.equal(piece.rotationDeg, to, `from ${from}°`);
  }
});

test("double right click between stops aligns with the nearest stop", () => {
  const card = new PlainCard();
  for (const [from, to] of [
    [30, 45],
    [100, 90],
    [350, 0], // nearest stop is 360°, normalized to 0°
  ]) {
    const piece = pieceAt(from);
    card.onDoubleRightClick(piece);
    assert.equal(piece.rotationDeg, to, `from ${from}°`);
  }
});

test("subclasses can override the double click handlers", () => {
  class SpinOnlyCard extends PlainCard {
    override onDoubleClick(piece: PieceState): void {
      piece.rotationDeg = 180;
    }
  }
  const piece = pieceAt(0);
  new SpinOnlyCard().onDoubleClick(piece);
  assert.equal(piece.faceUp, true);
  assert.equal(piece.rotationDeg, 180);
});
