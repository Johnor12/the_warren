# object — maintainer notes

- `object.ts` — the `GameObject` class (bounding-box dimensions with 8mm
  cube defaults, `thicknessMm` = height, footprint `outlineMm()`,
  overridable `shapeMm()` prisms, surface `color`, and `assertValid`
  bounding-box checks) and the `Prism`/`GameObjectSpec` types.
- `object.test.ts` — unit tests for the cube defaults, constructor spec
  and subclass overrides, inherited handlers, and `assertValid` rejection
  cases (non-positive dimensions, outline/prisms escaping the box,
  inverted prism heights).
