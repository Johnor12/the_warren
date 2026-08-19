# render

The isometric board renderer: everything needed to turn a `Board` into what
the browser displays. The server serializes the board with this directory's
helpers and serves `client.ts` (bundled) to the browser, which draws the
scene on a canvas in a fixed isometric projection.

## API

- `boardToDto(board)` — serialize a `Board` into the `BoardDto` JSON sent
  to the browser (face images referenced by URL).
- `pieceFaceImage(board, id, face)` — resolve a face image URL back to its
  `Image` (for serving PNGs).
- `BoardDto` / `PieceDto` — the shared server/client data types.
- `client.ts` — browser entry point; not imported by server code, but
  bundled (esbuild) and served as `/client.js`.
