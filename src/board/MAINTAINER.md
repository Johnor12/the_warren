# board — maintainer notes

- `board.ts` — the `Board` class (placement, bounds checking, the core
  `movePiece`/`rotatePiece` mutations, summary) and the `PlacedPiece`
  interface.
- `board.test.ts` — unit tests for initial piece state, move clamping,
  rotation normalization, and unknown-id handling.
