# card — maintainer notes

- `card.ts` — the abstract `Card` class extending `Component`
  (src/component/): dimensions + front/back Image contract, overridable
  `outlineMm()` shape with px conversion `outlinePx()`, `assertValid`
  invariant check including the shape-mapping rule — faces opaque only
  inside the outline — the flip `onDoubleClick` override, and
  `CARD_THICKNESS_MM`.
- `card.test.ts` — unit tests for the flip handler, handler overriding,
  outline validation, and the shape-mapping invariant (snap rotation is
  tested in src/component/).
