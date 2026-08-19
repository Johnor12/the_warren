# board

Board generation and state: running a board definition script produces a
completed `Board` object — the playing surface plus every placed piece with
its coordinates, rotation, face, and z-index. This object is what the
rendering server consumes and mutates as the player interacts with pieces.

## API

- `Board` — construct with `widthMm`/`heightMm`.
  - `place(card, xMm, yMm)` validates the card and places its center at the
    given coordinates (face up, unrotated), returning a `PlacedPiece`.
  - `piece(id)` looks up a placed piece.
  - `movePiece(id, xMm, yMm)` / `rotatePiece(id, rotationDeg)` — core piece
    manipulation (clamped to the board / normalized to [0, 360)); not
    routed through Card handlers, so subclasses cannot override it.
  - `centerX()`/`centerY()` give the board center; `describe()` returns a
    log-friendly summary.
- `PlacedPiece` — `{ id, card, zIndex }` plus the mutable `PieceState`
  (`xMm`, `yMm`, `rotationDeg`, `faceUp`).
