# render

The isometric board renderer: everything needed to turn a `Board` into what
the browser displays and to map mouse input back onto it. The server
serializes the board with this directory's helpers and serves `client.ts`
(bundled) to the browser, which draws the scene on a canvas.

Controls: on empty board, left-drag pans, mouse wheel zooms about the
cursor, right-drag left/right rotates the view around the screen center.
On a piece (a piece's whole visible body is clickable — top and side
faces — and clicks hit the topmost piece under the cursor): left-drag
moves it plus everything stacked on top of it — the drag is height-aware:
the stack floats above whatever it would currently land on (board, or
another piece's top) and drops exactly where it appears, so releasing a
piece over another's body rests it on top, never inside it; right-drag
rotates just that piece, double click flips it (cards; objects do nothing
by default), double right click snap-rotates it 45° — the double clicks
run the component's overridable handlers on the server.

Cards render as their face bitmaps plus gray side faces; 3D objects render
as their shape prisms — camera-facing sides shaded from the surface color,
tops in the full color. Physical heights honor mixed thicknesses: a card
dropped on an 8mm cube draws (and is picked) at 8mm.

## API

- `boardToDto(board)` — serialize a `Board` into the `BoardDto` JSON sent
  to the browser (card face images referenced by URL; object colors and
  prisms inline).
- `pieceUpdatesToDto(board)` — every piece's mutable state + id + z-index
  (the response of piece interaction POSTs; moves can restack pieces
  beyond the moved one).
- `pieceFaceImage(board, id, face)` — resolve a face image URL back to its
  `Image` (for serving PNGs); undefined for non-card pieces.
- `BoardDto` / `PieceDto` (a `CardDto | ObjectDto` union on `kind`) /
  `PrismDto` / `PieceStateDto` / `PieceUpdateDto` — the shared
  server/client data types.
- `Camera`, `fitCamera`, `project`, `unproject`, `pan`, `zoomAbout`,
  `rotateAbout` — the pure camera model and its mutations (DOM-free,
  unit tested).
- `buildScene(board, cam, lift?)` — the ordered 2D draw ops for a board as
  seen by a camera, honoring each piece's shape outline (side faces per
  outline edge; card face bitmaps carry the shape via transparency),
  rotation/face state, z-index and physical stack heights (stacks draw
  bottom-up), and an optional lifted stack drawn above everything
  (DOM-free, unit tested).
- `pickPiece(board, cam, sx, sy)` / `pieceTopMm(pieces, piece)` — hit
  testing; picks the topmost piece whose projected silhouette (top, bottom,
  and side faces of its outline extrusion, at its physical height) contains
  the screen point.
- `resolveDrag(board, cam, sx, sy, spec)` — height-aware drag resolution:
  reads the ambiguous isometric cursor against each candidate support
  height (board or a settled piece's top) and returns the highest
  physically consistent `{xMm, yMm, supportMm}`; undefined over
  inconsistent slivers (keep the last position).
- `client.ts` — browser entry point; not imported by server code, but
  bundled (esbuild) and served as `/client.js`.
