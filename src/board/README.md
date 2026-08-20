# board

Board generation and state: running a board definition script produces a
completed `Board` object — the playing surface plus every placed piece with
its coordinates, rotation, face, and z-index. This object is what the
rendering server consumes and mutates as the player interacts with pieces.

Pieces stack: any two pieces whose footprints share area (even a partial
overlap) occupy different z-indexes, ordered by arrival — later arrivals
land on top. Moving a piece carries everything stacked on top of it;
rotation and flipping affect only the one piece.

## API

- `Board` — construct with `widthMm`/`heightMm`.
  - `place(component, xMm, yMm)` validates the component (a `Card` or
    `GameObject`) and places its center at the given coordinates (face up,
    unrotated), stacked on top of anything it overlaps, returning a
    `PlacedPiece`.
  - `piece(id)` looks up a placed piece.
  - `movePiece(id, xMm, yMm)` — moves the piece (clamped to the board) and
    everything stacked on top of it by the same delta, then re-resolves
    z-indexes: the moved stack lands on top of whatever it now overlaps,
    or re-bases to z 0 on empty board.
  - `rotatePiece(id, rotationDeg)` — rotates one piece (normalized to
    [0, 360)); never restacks. Neither move nor rotate is routed through
    Component handlers, so subclasses cannot override them.
  - `centerX()`/`centerY()` give the board center; `describe()` returns a
    log-friendly summary.
- `PlacedPiece` — `{ id, component, zIndex, outlineMm, thicknessMm }` plus
  the mutable `PieceState` (`xMm`, `yMm`, `rotationDeg`, `faceUp`).
- `stacking.ts` — the pure stacking rules (`piecesOverlap`, `carriedStack`,
  `restingZ`, `resolveZ`, plus `stackBottoms` for physical heights when
  thicknesses vary) over a minimal `StackPiece` shape; browser-safe, also
  used by the renderer.
