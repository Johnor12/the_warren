# geometry — maintainer notes

- `polygon.ts` — the `Polygon` type, `pointInPolygon` (ray casting), and
  `rowSpans` (scanline x-intervals at a given y).
- `polygon.test.ts` — unit tests on a rectangle and a hexagon, including
  agreement between `rowSpans` and `pointInPolygon`.
