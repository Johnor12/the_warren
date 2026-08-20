/* START
 * Unit tests for polygon.ts: pointInPolygon and rowSpans on a rectangle
 * and a hexagon, including rows through and outside the shape and
 * agreement between the two functions; polygonsOverlap on partial overlap,
 * containment, coincidence, exact-edge adjacency (no overlap), and
 * vertex-free crossings.
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon, Polygon, polygonsOverlap, rowSpans } from "./polygon.js";

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

function rect(x0: number, y0: number, x1: number, y1: number): Polygon {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

test("polygonsOverlap detects partial overlap, containment, and coincidence", () => {
  assert.ok(polygonsOverlap(rect(0, 0, 10, 10), rect(5, 5, 15, 15))); // corner overlap
  assert.ok(polygonsOverlap(rect(0, 0, 10, 10), rect(3, 3, 7, 7))); // contained
  assert.ok(polygonsOverlap(rect(3, 3, 7, 7), rect(0, 0, 10, 10))); // containing
  assert.ok(polygonsOverlap(rect(0, 0, 10, 10), rect(0, 0, 10, 10))); // coincident
  assert.ok(polygonsOverlap(rect(0, 0, 10, 10), rect(5, 0, 15, 10))); // aligned half offset
});

test("polygonsOverlap rejects disjoint and exactly-adjacent polygons", () => {
  assert.ok(!polygonsOverlap(rect(0, 0, 10, 10), rect(20, 0, 30, 10)));
  // Sharing an edge (tiles laid side by side) is not an overlap.
  assert.ok(!polygonsOverlap(rect(0, 0, 10, 10), rect(10, 0, 20, 10)));
  // Sharing only a corner is not an overlap.
  assert.ok(!polygonsOverlap(rect(0, 0, 10, 10), rect(10, 10, 20, 20)));
  // Adjacent hexagons sharing an edge.
  assert.ok(!polygonsOverlap(HEX, HEX.map(([x, y]) => [x + 15, y + 5] as [number, number])));
});

test("polygonsOverlap detects a crossing that contains no vertex or centroid", () => {
  // A wide flat bar and a tall thin bar overlapping off both centers.
  assert.ok(polygonsOverlap(rect(0, 45, 100, 55), rect(70, -100, 80, 100)));
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
