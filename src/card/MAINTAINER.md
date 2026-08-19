# card — maintainer notes

- `card.ts` — the abstract `Card` class (dimensions + front/back Image
  contract, `assertValid` invariant check, overridable
  `onDoubleClick`/`onDoubleRightClick` handlers), the `PieceState`
  interface, `normalizeDeg`, and `CARD_THICKNESS_MM`.
- `card.test.ts` — unit tests for the default handlers (flip, 45° snap
  rotation) and handler overriding.
