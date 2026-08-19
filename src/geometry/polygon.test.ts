/* START
 * Unit tests for polygon.ts: pointInPolygon and rowSpans on a rectangle
 * and a hexagon, including rows through and outside the shape and
 * agreement between the two functions.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon, Polygon, rowSpans } from "./polygon.js";

const RECT: Polygon = [
  [0, 0],
  [10, 0],
  [10, 6],
  [0, 6],
];

// Hexagon with left/right vertices and flat top/bottom (see hexagonOutline).
const HEX: Polygon = [
  [0, 5],
  [5, 0],
  [15, 0],
  [20, 5],
  [15, 10],
  [5, 10],
];

test("pointInPolygon on a rectangle", () => {
  assert.ok(pointInPolygon(5, 3, RECT));
  assert.ok(!pointInPolygon(11, 3, RECT));
  assert.ok(!pointInPolygon(5, -1, RECT));
});

test("pointInPolygon on a hexagon excludes the bounding-box corners", () => {
  assert.ok(pointInPolygon(10, 5, HEX));
  assert.ok(pointInPolygon(1, 5, HEX)); // near the left vertex
  assert.ok(!pointInPolygon(1, 1, HEX)); // corner cut off by the slope
});

test("rowSpans covers the full width of a rectangle row", () => {
  assert.deepEqual(rowSpans(RECT, 3), [[0, 10]]);
  assert.deepEqual(rowSpans(RECT, 7), []);
});

test("rowSpans narrows on hexagon rows near the flat edges", () => {
  assert.deepEqual(rowSpans(HEX, 5), [[0, 20]]); // through the vertices
  assert.deepEqual(rowSpans(HEX, 2.5), [[2.5, 17.5]]); // halfway up a slope
});

test("rowSpans agrees with pointInPolygon", () => {
  for (const y of [0.5, 2.5, 5, 9.5]) {
    const spans = rowSpans(HEX, y);
    for (const x of [0.5, 3, 10, 17, 19.5]) {
      assert.equal(
        spans.some(([x0, x1]) => x >= x0 && x <= x1),
        pointInPolygon(x, y, HEX) ||
          spans.some(([x0, x1]) => x === x0 || x === x1), // boundary: span-inclusive
        `(${x}, ${y})`,
      );
    }
  }
});
