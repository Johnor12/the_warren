/* START
 * Unit tests for the Card interaction handlers: the default double-click
 * flip, the default double-right-click 45° snap rotation (advance from a
 * stop, align to the nearest stop from between stops, wrap at 360°), and
 * that subclasses can override both handlers. Also assertValid outline
 * checks (out-of-bounds rejection) and the shape-mapping invariant (face
 * bitmaps opaque only inside the outline).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { polygonImage, solidImage } from "../image/create.js";
import { Card, hexagonOutline, Outline, PieceState } from "./card.js";

const RED = { r: 200, g: 60, b: 60, a: 255 };
const BLUE = { r: 60, g: 60, b: 200, a: 255 };

class PlainCard extends Card {
  readonly widthMm = 10;
  readonly heightMm = 10;
  readonly front = solidImage(100, 100, RED);
  readonly back = solidImage(100, 100, BLUE);
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

class HexCard extends PlainCard {
  override outlineMm(): Outline {
    return hexagonOutline(this.widthMm, this.heightMm);
  }
}

test("assertValid accepts shape-mapped faces", () => {
  assert.doesNotThrow(() => new PlainCard().assertValid());
  class ShapedHexCard extends HexCard {
    override readonly front = polygonImage(100, 100, this.outlinePx(), RED);
    override readonly back = polygonImage(100, 100, this.outlinePx(), BLUE);
  }
  assert.doesNotThrow(() => new ShapedHexCard().assertValid());
});

test("assertValid rejects faces that are opaque outside the outline", () => {
  // PlainCard's solid rectangular faces spill over HexCard's hexagon.
  assert.throws(() => new HexCard().assertValid(), /map to the card's 2D shape/);
});

test("assertValid rejects an outline that leaves the card bounds", () => {
  class OverflowCard extends PlainCard {
    override outlineMm(): Outline {
      // x = ±6 sticks out of the 10mm-wide card.
      return [
        [-6, 0],
        [0, -5],
        [6, 0],
        [0, 5],
      ];
    }
  }
  assert.throws(() => new OverflowCard().assertValid(), /outside/);
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
