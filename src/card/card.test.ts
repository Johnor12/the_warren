/* START
 * Unit tests for Card: the default double-click flip, that subclasses can
 * override the interaction handlers, and assertValid outline checks
 * (out-of-bounds rejection) and the shape-mapping invariant (face bitmaps
 * opaque only inside the outline). The inherited 45° snap rotation is
 * tested in src/component/component.test.ts.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { hexagonOutline, Outline, PieceState } from "../component/component.js";
import { polygonImage, solidImage } from "../image/create.js";
import { Card } from "./card.js";

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

test("cards have the fixed 0.3mm thickness", () => {
  assert.equal(new PlainCard().thicknessMm, 0.3);
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
