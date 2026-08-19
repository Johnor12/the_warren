# render

The isometric board renderer: everything needed to turn a `Board` into what
the browser displays and to map mouse input back onto it. The server
serializes the board with this directory's helpers and serves `client.ts`
(bundled) to the browser, which draws the scene on a canvas.

Controls: on empty board, left-drag pans, mouse wheel zooms about the
cursor, right-drag left/right rotates the view around the screen center.
On a piece: left-drag moves it (the card is lifted above the board while
moving), right-drag rotates it, double click flips it, double right click
snap-rotates it 45° — the double clicks run the card's overridable
handlers on the server.

## API

- `boardToDto(board)` — serialize a `Board` into the `BoardDto` JSON sent
  to the browser (face images referenced by URL).
- `pieceStateToDto(piece)` — the mutable piece state alone (the response of
  piece interaction POSTs).
- `pieceFaceImage(board, id, face)` — resolve a face image URL back to its
  `Image` (for serving PNGs).
- `BoardDto` / `PieceDto` / `PieceStateDto` — the shared server/client data
  types.
- `Camera`, `fitCamera`, `project`, `unproject`, `pan`, `zoomAbout`,
  `rotateAbout` — the pure camera model and its mutations (DOM-free,
  unit tested).
- `buildScene(board, cam, lift?)` — the ordered 2D draw ops for a board as
  seen by a camera, honoring each piece's shape outline (side faces per
  outline edge; face bitmaps carry the shape via transparency),
  rotation/face state, and an optional lifted piece (DOM-free, unit
  tested).
- `pickPiece(board, cam, sx, sy)` / `pieceTopMm(piece)` — hit testing.
- `client.ts` — browser entry point; not imported by server code, but
  bundled (esbuild) and served as `/client.js`.
