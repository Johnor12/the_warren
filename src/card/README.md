# card

The abstract base type for game cards. Users define their components as
classes inheriting from `Card`; the only invariants are physical dimensions
and front/back `Image`s whose pixel dimensions match those physical
dimensions.

## API

- `Card` — abstract class; implement `widthMm`, `heightMm`, `front`, `back`.
  `assertValid()` checks the face-image/dimension invariant (called by the
  board when a card is placed).
- `CARD_THICKNESS_MM` — fixed 0.3mm card height, for isometric rendering.
