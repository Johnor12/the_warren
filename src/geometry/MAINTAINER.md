# geometry — maintainer notes

- `polygon.ts` — the `Polygon` type, `pointInPolygon` (ray casting),
  `rowSpans` (scanline x-intervals at a given y), and `polygonsOverlap`
  (interior overlap: nudged-vertex/centroid inside tests plus strict edge
  crossings, so exact edge adjacency is not an overlap).
- `polygon.test.ts` — unit tests on a rectangle and a hexagon, including
  agreement between `rowSpans` and `pointInPolygon`, and `polygonsOverlap`
  cases (partial, containment, coincident, adjacent, vertex-free cross).
