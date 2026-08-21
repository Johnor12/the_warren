# component — maintainer notes

- `component.ts` — the abstract `Component` class (`thicknessMm` +
  `outlineMm()` contract, `shapeMm()` physical shape — default one prism
  filling outline x thickness; pieces stack on prisms — `assertValid`
  outline check, overridable `onDoubleClick`/`onDoubleRightClick` handlers
  — the default 45° snap rotation lives here), the `Outline` and `Prism`
  types with `rectangleOutline`/`hexagonOutline` builders, the
  `PieceState` interface, and `normalizeDeg`.
- `component.test.ts` — unit tests for the default handlers (no-op double
  click, 45° snap rotation), outline validation, and `normalizeDeg`.
