# card

The abstract base type for game cards. Users define their cards as classes
inheriting from `Card` (itself a `Component`, src/component/); the only
invariants are physical dimensions, a 2D shape outline that fits inside
them (default: the full rectangle), and front/back `Image`s that match
those dimensions and map to that shape (opaque only inside the outline).

Cards also define their interaction behavior. The double-click handlers
(inherited from `Component`) are overridable in subclasses; click + drag
movement and rotation are core system features and cannot be overridden.

## API

- `Card` — abstract class; implement `widthMm`, `heightMm`, `front`, `back`.
  `assertValid()` checks the invariants (called by the board when a card is
  placed): face pixel dimensions match the physical dimensions, the outline
  fits inside them, and the face bitmaps map to the card's 2D shape — opaque
  pixels only inside the outline. Override `outlineMm()` for non-rectangular
  cards: it returns the card's shape polygon in card-local mm coordinates.
  Build shaped faces with `polygonImage`/`maskedImage` (see `src/image/`)
  using `outlinePx()`, the outline in face-image pixel coordinates.
  Interaction handlers (see src/component/ for `PieceState`):
  - `onDoubleClick(piece)` — default: flip the card over.
  - `onDoubleRightClick(piece)` — inherited: 45° snap rotation.
- `CARD_THICKNESS_MM` — fixed 0.3mm card height (`Card.thicknessMm`), for
  isometric rendering and stack heights.
