# card — maintainer notes

- `card.ts` — the abstract `Card` class (dimensions + front/back Image
  contract, overridable `outlineMm()` shape with px conversion `outlinePx()`,
  `assertValid` invariant check including the shape-mapping rule — faces
  opaque only inside the outline — and overridable
  `onDoubleClick`/`onDoubleRightClick` handlers), the `Outline` type with
  `rectangleOutline`/`hexagonOutline` builders, the `PieceState` interface,
  `normalizeDeg`, and `CARD_THICKNESS_MM`.
- `card.test.ts` — unit tests for the default handlers (flip, 45° snap
  rotation), handler overriding, outline validation, and the shape-mapping
  invariant.
