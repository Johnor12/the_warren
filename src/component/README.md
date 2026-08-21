# component

The abstract base type for all game pieces. Users define their components
as classes inheriting from `Card` (src/card/) or `GameObject` (src/object/),
both of which inherit from `Component`: a 2D footprint outline, a vertical
thickness, and the overridable double-click interaction handlers. Click +
drag movement and rotation are core system features and cannot be
overridden.

## API

- `Component` — abstract class; implement `thicknessMm` (vertical extent)
  and `outlineMm()`, the footprint polygon in component-local mm
  coordinates (origin at the component center), used for stacking, hit
  testing, and side-face rendering. `shapeMm()` is the physical 3D shape
  as `Prism[]` (default: one prism filling outline x thickness); stacked
  pieces rest on the tallest prism under their footprint. `assertValid()`
  checks the outline is a valid polygon; subclasses extend it. Overridable
  interaction handlers, each receiving the piece's mutable `PieceState`:
  - `onDoubleClick(piece)` — default: nothing (Card overrides it to flip).
  - `onDoubleRightClick(piece)` — default: rotate 45°, first aligning with
    the nearest 45° stop if between stops.
- `Outline` — a shape polygon: `[x, y][]` mm points around the center.
- `Prism` — one vertical extrusion of a shape:
  `{ outlineMm, bottomMm, topMm }` in component-local mm.
- `rectangleOutline(w, h)` / `hexagonOutline(w, h)` — outline builders; the
  hexagon has left/right vertices and flat top/bottom edges (regular when
  `w ≈ h * 2 / sqrt(3)`, e.g. 95x83mm).
- `PieceState` — the mutable on-board state handlers receive: `xMm`, `yMm`,
  `rotationDeg`, `faceUp` (cards only).
- `normalizeDeg(deg)` — normalize an angle into [0, 360).
