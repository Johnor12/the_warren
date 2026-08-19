# boards — maintainer notes

- `test-board.ts` — the test cards and `buildBoard()`, which spreads them
  over a 500x500mm board: `TestCard` (standard 41x63mm), `HexCard`
  (hexagonal 95x83mm, faces are hexagon-filling bitmaps), `BigCard`
  (63x88mm) — all white with "Front"/"Back" text via the shape-aware
  `textFace` helper — and `ArtCard` (41x63mm, faces imported from
  `assets/` PNGs). Run directly, it also prints the board summary and
  exports the face images to `out/`.
- `assets/` — `dice.png` and `example.png` (from Wikimedia Commons), the
  imported `ArtCard` faces.
