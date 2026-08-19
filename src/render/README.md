# render

The isometric board renderer: everything needed to turn a `Board` into what
the browser displays. The server serializes the board with this directory's
helpers and serves `client.ts` (bundled) to the browser, which draws the
scene on a canvas with an interactive isometric camera: left-drag pans,
mouse wheel zooms about the cursor, right-drag left/right rotates the view
around the screen center.

## API

- `boardToDto(board)` — serialize a `Board` into the `BoardDto` JSON sent
  to the browser (face images referenced by URL).
- `pieceFaceImage(board, id, face)` — resolve a face image URL back to its
  `Image` (for serving PNGs).
- `BoardDto` / `PieceDto` — the shared server/client data types.
- `Camera`, `fitCamera`, `project`, `unproject`, `pan`, `zoomAbout`,
  `rotateAbout` — the pure camera model and its mutations (DOM-free,
  unit tested).
- `buildScene(board, cam)` — the ordered 2D draw ops for a board as seen
  by a camera (DOM-free, unit tested).
- `client.ts` — browser entry point; not imported by server code, but
  bundled (esbuild) and served as `/client.js`.
