# render

The isometric board renderer: everything needed to turn a `Board` into what
the browser displays and to map mouse input back onto it. The server
serializes the board with this directory's helpers and serves `client.ts`
(bundled) to the browser, which draws the scene on a canvas.

Controls: on empty board, left-drag pans, mouse wheel zooms about the
cursor, right-drag left/right rotates the view around the screen center.
On a piece (clicks always hit the topmost piece under the cursor):
left-drag moves it plus everything stacked on top of it — the stack lifts
above the board while moving, floating over anything it passes, and lands
on top of whatever it's dropped on; right-drag rotates just that piece,
double click flips it, double right click snap-rotates it 45° — the double
clicks run the card's overridable handlers on the server.

## API

- `boardToDto(board)` — serialize a `Board` into the `BoardDto` JSON sent
  to the browser (face images referenced by URL).
- `pieceUpdatesToDto(board)` — every piece's mutable state + id + z-index
  (the response of piece interaction POSTs; moves can restack pieces
  beyond the moved one).
- `pieceFaceImage(board, id, face)` — resolve a face image URL back to its
  `Image` (for serving PNGs).
- `BoardDto` / `PieceDto` / `PieceStateDto` / `PieceUpdateDto` — the shared
  server/client data types.
- `Camera`, `fitCamera`, `project`, `unproject`, `pan`, `zoomAbout`,
  `rotateAbout` — the pure camera model and its mutations (DOM-free,
  unit tested).
- `buildScene(board, cam, lift?)` — the ordered 2D draw ops for a board as
  seen by a camera, honoring each piece's shape outline (side faces per
  outline edge; face bitmaps carry the shape via transparency),
  rotation/face state, z-index (stacks draw bottom-up), and an optional
  lifted stack drawn above everything (DOM-free, unit tested).
- `pickPiece(board, cam, sx, sy)` / `pieceTopMm(piece)` — hit testing;
  picks the topmost piece under the point.
- `client.ts` — browser entry point; not imported by server code, but
  bundled (esbuild) and served as `/client.js`.
