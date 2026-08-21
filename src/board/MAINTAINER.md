# board — maintainer notes

- `board.ts` — the `Board` class (placement, bounds checking, the core
  `movePiece`/`rotatePiece` mutations, summary) and the `PlacedPiece`
  interface (component + cached outline, thickness, and shape prisms).
  Placement and moves delegate stacking to `stacking.ts`.
- `stacking.ts` — pure stacking logic over the minimal `StackPiece` shape
  (satisfied by both `PlacedPiece` and the renderer's `PieceDto`):
  `footprint` (world-space outline), `piecesOverlap`, `carriedStack` (what
  moves together: pieces physically resting on the stack, not everything
  overlapping from a higher z — an overhanging card must not bind to a
  ground card passing under it), `restingZ`, `resolveZ` (z re-resolution
  after a move), `stackBottoms` (each piece's physical bottom height in
  mm — pieces rest on the tallest shape prism under their footprint, via
  the private `surfaceTopMm`, so a card on a tiered object's low tier
  sits at that tier's top; z-indexes stay the stacking model, heights
  only drive rendering and hit testing), and `landingBottoms` (where each
  member of a moving stack would land if dropped now — the drag preview,
  matching the post-drop result exactly). No node imports, so the browser
  client can bundle it.
- `board.test.ts` — unit tests for initial piece state, move clamping,
  rotation normalization, unknown-id handling, and stacking through the
  Board API (arrival order, carried moves, dropping onto a tall stack,
  re-basing, rotation not restacking, mixed cards and objects, a tiered
  object carrying a card resting on its low tier).
- `stacking.test.ts` — unit tests for the pure stacking functions,
  including `stackBottoms` with mixed thicknesses and tiered prisms, and
  `landingBottoms` previews.
