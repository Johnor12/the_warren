/* START
 * Unit tests for stacking.ts: rotated footprints, overlap between pieces,
 * carried-stack membership (transitive, physical support only), restingZ,
 * resolveZ
 * (arrival order, re-basing, moved stack landing on top), stackBottoms
 * (physical heights with mixed thicknesses; tiered shapes support at the
 * prism under the footprint, not the bounding box), and landingBottoms
 * (per-piece drop preview for a moving stack).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { rectangleOutline } from "../component/component.js";
import {
  carriedStack,
  footprint,
  landingBottoms,
  piecesOverlap,
  resolveZ,
  restingZ,
  stackBottoms,
  StackPiece,
} from "./stacking.js";

// A 10x10mm square piece at (x, y).
function square(xMm: number, yMm: number, zIndex = 0, rotationDeg = 0, thicknessMm = 1): StackPiece {
  return { xMm, yMm, rotationDeg, zIndex, outlineMm: rectangleOutline(10, 10), thicknessMm };
}

test("footprint rotates the outline about the piece center", () => {
  const piece: StackPiece = {
    xMm: 100,
    yMm: 50,
    rotationDeg: 90,
    zIndex: 0,
    outlineMm: rectangleOutline(10, 20),
    thicknessMm: 1,
  };
  // Local (-5, -10) rotates to (10, -5), so the corner lands at (110, 45).
  const [x, y] = footprint(piece)[0];
  assert.ok(Math.abs(x - 110) < 1e-9 && Math.abs(y - 45) < 1e-9);
});

test("piecesOverlap sees partial overlap and honors rotation", () => {
  assert.ok(piecesOverlap(square(0, 0), square(6, 6)));
  assert.ok(!piecesOverlap(square(0, 0), square(12, 0)));
  // Rotating 45 degrees reaches past the unrotated 5mm half-width.
  assert.ok(piecesOverlap(square(0, 0, 0, 45), square(12, 0)));
});

test("carriedStack takes the base and everything above it, transitively", () => {
  const base = square(0, 0, 0);
  const mid = square(6, 0, 1); // on base
  const top = square(12, 0, 2); // on mid only (clear of base)
  const bystander = square(30, 0, 0);
  const pieces = [base, mid, top, bystander];
  assert.deepEqual(carriedStack(pieces, base), [base, mid, top]);
  // Moving mid leaves base behind but still carries top.
  assert.deepEqual(carriedStack(pieces, mid), [mid, top]);
  assert.deepEqual(carriedStack(pieces, top), [top]);
});

test("carriedStack only carries pieces physically resting on the stack", () => {
  const cube = square(0, 0, 0, 0, 8);
  const overhang = square(6, 0, 1, 0, 0.3); // on the cube, hanging past its edge
  const groundCard = square(12, 0, 0, 0, 0.3); // on the board, under the overhang
  const pieces = [cube, overhang, groundCard];
  // The overhang overlaps the ground card from above but rests on the cube,
  // so moving the ground card must not steal it.
  assert.deepEqual(carriedStack(pieces, groundCard), [groundCard]);
  assert.deepEqual(carriedStack(pieces, cube), [cube, overhang]);
});

test("a bridge resting on two equal supports moves with either one", () => {
  const left = square(0, 0, 0, 0, 8);
  const right = square(10, 0, 0, 0, 8);
  const bridge = square(5, 0, 1, 0, 0.3); // rests on both cubes
  assert.deepEqual(carriedStack([left, right, bridge], left), [left, bridge]);
  assert.deepEqual(carriedStack([left, right, bridge], right), [right, bridge]);
});

test("carriedStack ignores overlapping pieces below the base", () => {
  const bottom = square(0, 0, 0);
  const top = square(6, 0, 1);
  assert.deepEqual(carriedStack([bottom, top], top), [top]);
});

test("restingZ lands on the highest overlapped piece", () => {
  assert.equal(restingZ(square(0, 0), []), 0);
  assert.equal(restingZ(square(0, 0), [square(6, 0, 3)]), 4);
  assert.equal(restingZ(square(0, 0), [square(30, 0, 3)]), 0);
});

test("resolveZ re-bases a stack dropped onto empty board", () => {
  const a = square(0, 0, 3);
  const b = square(0, 0, 4);
  resolveZ([a, b], [a, b]);
  assert.deepEqual([a.zIndex, b.zIndex], [0, 1]);
});

test("resolveZ lands the moved stack on top of what it now overlaps", () => {
  const settledBottom = square(0, 0, 0);
  const settledTop = square(0, 0, 1);
  const moved = square(4, 0, 0); // dragged onto the settled stack
  resolveZ([settledBottom, settledTop, moved], [moved]);
  assert.deepEqual(
    [settledBottom.zIndex, settledTop.zIndex, moved.zIndex],
    [0, 1, 2],
  );
});

test("resolveZ keeps settled arrival order and leaves disjoint stacks alone", () => {
  const a = square(0, 0, 0);
  const b = square(0, 0, 1);
  const far = square(50, 0, 0);
  const moved = square(25, 0, 5); // pulled off some tall stack, dropped clear
  resolveZ([a, b, far, moved], [moved]);
  assert.deepEqual(
    [a.zIndex, b.zIndex, far.zIndex, moved.zIndex],
    [0, 1, 0, 0],
  );
});

test("stackBottoms accumulates the thicknesses below each piece", () => {
  const cube = square(0, 0, 0, 0, 8);
  const card = square(4, 0, 1, 0, 0.3); // resting on the cube
  const topCard = square(4, 0, 2, 0, 0.3);
  const lone = square(50, 0, 0, 0, 0.3);
  const bottoms = stackBottoms([cube, card, topCard, lone]);
  assert.deepEqual(
    [bottoms.get(cube), bottoms.get(card), bottoms.get(topCard), bottoms.get(lone)],
    [0, 8, 8.3, 0],
  );
});

test("stackBottoms rests a bridging piece on the tallest support", () => {
  const shortCube = square(0, 0, 0, 0, 4);
  const tallCube = square(10, 0, 0, 0, 8);
  const bridge = square(5, 0, 1, 0, 0.3); // overlaps both cubes
  const bottoms = stackBottoms([shortCube, tallCube, bridge]);
  assert.equal(bottoms.get(bridge), 8);
});

// A 20x20x30mm two-tier tower at (x, y): a full-footprint 18mm base with a
// narrow 30mm cap in the center.
function tower(xMm: number, yMm: number, zIndex = 0): StackPiece {
  return {
    xMm,
    yMm,
    rotationDeg: 0,
    zIndex,
    outlineMm: rectangleOutline(20, 20),
    thicknessMm: 30,
    prisms: [
      { outlineMm: rectangleOutline(20, 20), topMm: 18 },
      { outlineMm: rectangleOutline(6, 6), topMm: 30 },
    ],
  };
}

test("stackBottoms rests a piece on the prism under it, not the bounding box", () => {
  const base = tower(0, 0);
  const onTier = square(-12, 0, 1, 0, 0.3); // overlaps only the 18mm base tier
  const onCap = square(0, 0, 2, 0, 0.3); // overlaps the 30mm cap
  const bottoms = stackBottoms([base, onTier, onCap]);
  assert.equal(bottoms.get(onTier), 18);
  assert.equal(bottoms.get(onCap), 30);
});

test("carriedStack carries a piece resting on a lower tier", () => {
  const base = tower(0, 0);
  const onTier = square(-12, 0, 1, 0, 0.3);
  assert.deepEqual(carriedStack([base, onTier], base), [base, onTier]);
});

test("landingBottoms previews each moving piece's own landing height", () => {
  const cube = square(14, 0, 0, 0, 8); // settled
  const movingBase = square(0, 0, 0, 0, 0.3);
  const movingTop = square(6, 0, 1, 0, 0.3); // carried, overhanging the base
  // The overhanging top is over the cube: it would land on the cube's 8mm
  // top while the base lands on the board.
  const landing = landingBottoms([cube], [movingBase, movingTop]);
  assert.equal(landing.get(movingBase), 0);
  assert.equal(landing.get(movingTop), 8);
  // Clear of the cube, the stack keeps its integrity: top back on base.
  const clear = landingBottoms([cube], [square(40, 0, 0, 0, 0.3), square(46, 0, 1, 0, 0.3)]);
  assert.deepEqual([...clear.values()], [0, 0.3]);
});
