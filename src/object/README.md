# object

The base type for 3D game pieces (cubes, tokens, meeples). `GameObject`
(named so it doesn't shadow JavaScript's global `Object`) inherits from
`Component` and so shares the movement, rotation, and stacking systems
with cards; flipping is not relevant (double click does nothing by
default).

An object is a bounding box — length (x) x width (y) x height (vertical),
defaulting to an 8mm cube — whose footprint drives stacking order and
inputs, plus a 3D shape inside that box (default: a solid cuboid filling
it) with a single surface color (no textures). The shape is physical:
pieces dropped on the object rest on the actual prisms under them (a card
on a tiered object's low tier sits at that tier's top, not the box top).

## API

- `GameObject` — construct with an optional spec
  (`new GameObject({ lengthMm, widthMm, heightMm, color })`; all default,
  8/8/8mm light gray) or subclass and override fields. `assertValid()`
  (called by the board on placement) checks positive dimensions and that
  the footprint outline and every shape prism stay inside the bounding
  box. Overridables:
  - `outlineMm()` — the footprint (default: the box rectangle).
  - `shapeMm()` (inherited from `Component`) — the physical and rendered
    shape as `Prism[]` (default: one prism filling the box).
  - the inherited `onDoubleClick` (default: nothing) and
    `onDoubleRightClick` (default: 45° snap rotation).
- `Prism` (re-exported from src/component/) — one vertical extrusion of
  the shape: `{ outlineMm, bottomMm, topMm }` in object-local mm (heights
  above the object's base). Stack several for tiered shapes.
- `GameObjectSpec` — the constructor spec (dimensions + `Color` from
  src/image/).
