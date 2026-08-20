# board — maintainer notes

- `board.ts` — the `Board` class (placement, bounds checking, the core
  `movePiece`/`rotatePiece` mutations, summary) and the `PlacedPiece`
  interface. Placement and moves delegate stacking to `stacking.ts`.
- `stacking.ts` — pure stacking logic over the minimal `StackPiece` shape
  (satisfied by both `PlacedPiece` and the renderer's `PieceDto`):
  `footprint` (world-space outline), `piecesOverlap`, `carriedStack` (what
  moves together), `restingZ`, and `resolveZ` (z re-resolution after a
  move). No node imports, so the browser client can bundle it.
- `board.test.ts` — unit tests for initial piece state, move clamping,
  rotation normalization, unknown-id handling, and stacking through the
  Board API (arrival order, carried moves, dropping onto a tall stack,
  re-basing, rotation not restacking).
- `stacking.test.ts` — unit tests for the pure stacking functions.
