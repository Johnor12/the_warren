# card

The abstract base type for game cards. Users define their components as
classes inheriting from `Card`; the only invariants are physical dimensions,
a 2D shape outline that fits inside them (default: the full rectangle), and
front/back `Image`s that match those dimensions and map to that shape
(opaque only inside the outline).

Cards also define their interaction behavior. The double-click handlers are
overridable in subclasses; click + drag movement and rotation are core
system features and cannot be overridden.

## API

- `Card` — abstract class; implement `widthMm`, `heightMm`, `front`, `back`.
  `assertValid()` checks the invariants (called by the board when a card is
  placed): face pixel dimensions match the physical dimensions, the outline
  fits inside them, and the face bitmaps map to the card's 2D shape — opaque
  pixels only inside the outline. Override `outlineMm()` for non-rectangular
  cards: it returns the card's shape polygon in card-local mm coordinates.
  Build shaped faces with `polygonImage`/`maskedImage` (see `src/image/`)
  using `outlinePx()`, the outline in face-image pixel coordinates.
  Overridable interaction handlers, each receiving the piece's mutable
  `PieceState`:
  - `onDoubleClick(piece)` — default: flip the card over.
  - `onDoubleRightClick(piece)` — default: rotate 45°, first aligning with
    the nearest 45° stop if between stops.
- `Outline` — a shape polygon: `[x, y][]` mm points around the card center.
- `rectangleOutline(w, h)` / `hexagonOutline(w, h)` — outline builders; the
  hexagon has left/right vertices and flat top/bottom edges (regular when
  `w ≈ h * 2 / sqrt(3)`, e.g. 95x83mm).
- `PieceState` — the mutable on-board state handlers receive: `xMm`, `yMm`,
  `rotationDeg`, `faceUp`.
- `normalizeDeg(deg)` — normalize an angle into [0, 360).
- `CARD_THICKNESS_MM` — fixed 0.3mm card height, for isometric rendering.
