/* START
 * Unit tests for GameObject: the 8mm-cube defaults (bounding box, footprint
 * outline, one full-box prism, thickness = height), constructor spec and
 * subclass field overrides, the inherited interaction handlers (no-op
 * double click, 45° snap rotation), and assertValid (non-positive
 * dimensions, outline and prisms escaping the bounding box, inverted or
 * out-of-range prism heights).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Outline, PieceState } from "../component/component.js";
import { GameObject, Prism } from "./object.js";

function pieceAt(rotationDeg: number): PieceState {
  return { xMm: 0, yMm: 0, rotationDeg, faceUp: true };
}

test("defaults to a valid 8mm cube", () => {
  const cube = new GameObject();
  assert.deepEqual([cube.lengthMm, cube.widthMm, cube.heightMm], [8, 8, 8]);
  assert.equal(cube.thicknessMm, 8);
  assert.deepEqual(cube.outlineMm(), [
    [-4, -4],
    [4, -4],
    [4, 4],
    [-4, 4],
  ]);
  assert.deepEqual(cube.shapeMm(), [{ outlineMm: cube.outlineMm(), bottomMm: 0, topMm: 8 }]);
  assert.doesNotThrow(() => cube.assertValid());
});

test("the constructor spec sets the bounding box and color", () => {
  const slab = new GameObject({ lengthMm: 20, widthMm: 10, heightMm: 4, color: { r: 200, g: 0, b: 0, a: 255 } });
  assert.deepEqual([slab.lengthMm, slab.widthMm, slab.heightMm], [20, 10, 4]);
  assert.equal(slab.thicknessMm, 4);
  assert.equal(slab.color.r, 200);
  assert.doesNotThrow(() => slab.assertValid());
});

test("subclasses can override fields and the shape", () => {
  class Tower extends GameObject {
    constructor() {
      super({ lengthMm: 10, widthMm: 10, heightMm: 20 });
    }

    override shapeMm(): Prism[] {
      return [
        { outlineMm: this.outlineMm(), bottomMm: 0, topMm: 10 },
        {
          outlineMm: [
            [-2, -2],
            [2, -2],
            [2, 2],
            [-2, 2],
          ],
          bottomMm: 10,
          topMm: 20,
        },
      ];
    }
  }
  const tower = new Tower();
  assert.equal(tower.thicknessMm, 20);
  assert.equal(tower.shapeMm().length, 2);
  assert.doesNotThrow(() => tower.assertValid());
});

test("double click does nothing; double right click snap-rotates 45°", () => {
  const cube = new GameObject();
  const piece = pieceAt(0);
  cube.onDoubleClick(piece);
  assert.deepEqual(piece, pieceAt(0));
  cube.onDoubleRightClick(piece);
  assert.equal(piece.rotationDeg, 45);
});

test("assertValid rejects non-positive dimensions", () => {
  assert.throws(() => new GameObject({ heightMm: 0 }).assertValid(), /must be positive/);
  assert.throws(() => new GameObject({ widthMm: -1 }).assertValid(), /must be positive/);
});

test("assertValid rejects an outline outside the bounding box", () => {
  class WideFoot extends GameObject {
    override outlineMm(): Outline {
      return [
        [-6, -4],
        [6, -4],
        [6, 4],
        [-6, 4],
      ];
    }
  }
  assert.throws(() => new WideFoot().assertValid(), /outside the 8x8mm bounding box/);
});

test("assertValid rejects prisms escaping the bounding box", () => {
  const outside: Prism = {
    outlineMm: [
      [-5, -1],
      [5, -1],
      [0, 1],
    ],
    bottomMm: 0,
    topMm: 8,
  };
  const tooTall: Prism = { outlineMm: new GameObject().outlineMm(), bottomMm: 0, topMm: 9 };
  const inverted: Prism = { outlineMm: new GameObject().outlineMm(), bottomMm: 5, topMm: 5 };
  for (const [prism, message] of [
    [outside, /outside the 8x8mm bounding box/],
    [tooTall, /within 0..8mm/],
    [inverted, /within 0..8mm/],
  ] as const) {
    class Bad extends GameObject {
      override shapeMm(): Prism[] {
        return [prism];
      }
    }
    assert.throws(() => new Bad().assertValid(), message);
  }
});
