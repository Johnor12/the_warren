# geometry

Pure 2D geometry shared by the rest of the system (card shape validation,
image rasterization, renderer hit testing). No dependencies on other
directories.

## API

- `Polygon` — a polygon as `[x, y][]` points (any unit, any origin).
- `pointInPolygon(x, y, polygon)` — ray-casting inside test.
- `rowSpans(polygon, y)` — the x-intervals covered by the polygon along the
  horizontal line at y, as sorted `[start, end]` pairs; the scanline
  primitive for polygon fills, masks, and shape checks.
- `polygonsOverlap(a, b)` — whether two polygons' interiors share area;
  touching along an edge or at a vertex (tiles laid side by side) does not
  count. Used by the stacking system's overlap checks.
