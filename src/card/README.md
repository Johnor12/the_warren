# card

The abstract base type for game cards. Users define their components as
classes inheriting from `Card`; the only invariants are physical dimensions
and front/back `Image`s whose pixel dimensions match those physical
dimensions.

Cards also define their interaction behavior. The double-click handlers are
overridable in subclasses; click + drag movement and rotation are core
system features and cannot be overridden.

## API

- `Card` — abstract class; implement `widthMm`, `heightMm`, `front`, `back`.
  `assertValid()` checks the face-image/dimension invariant (called by the
  board when a card is placed). Overridable interaction handlers, each
  receiving the piece's mutable `PieceState`:
  - `onDoubleClick(piece)` — default: flip the card over.
  - `onDoubleRightClick(piece)` — default: rotate 45°, first aligning with
    the nearest 45° stop if between stops.
- `PieceState` — the mutable on-board state handlers receive: `xMm`, `yMm`,
  `rotationDeg`, `faceUp`.
- `normalizeDeg(deg)` — normalize an angle into [0, 360).
- `CARD_THICKNESS_MM` — fixed 0.3mm card height, for isometric rendering.
