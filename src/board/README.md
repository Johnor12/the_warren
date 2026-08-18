# board

Board generation: running a board definition script produces a completed
`Board` object — the playing surface plus every placed piece with its
coordinates and z-index. This object is what the (future) rendering server
consumes.

## API

- `Board` — construct with `widthMm`/`heightMm`. `place(card, xMm, yMm)`
  validates the card and places its center at the given coordinates,
  returning a `PlacedPiece`. `centerX()`/`centerY()` give the board center;
  `describe()` returns a log-friendly summary.
- `PlacedPiece` — `{ id, card, xMm, yMm, zIndex }`.
