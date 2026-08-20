/* START
 * Unit tests for stacking.ts: rotated footprints, overlap between pieces,
 * carried-stack membership (transitive, above only), restingZ, resolveZ
 * (arrival order, re-basing, moved stack landing on top), and stackBottoms
 * (physical heights with mixed thicknesses).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { rectangleOutline } from "../component/component.js";
import {
  carriedStack,
  footprint,
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
