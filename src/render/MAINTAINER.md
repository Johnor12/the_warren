# render — maintainer notes

- `types.ts` — `BoardDto` / `PieceDto`, the JSON contract between server
  and browser.
- `serialize.ts` — `boardToDto` (Board -> BoardDto) and `pieceFaceImage`
  (face URL -> Image) for the server.
- `client.ts` — the browser renderer: fetches `/board.json`, loads face
  images, and draws the board and pieces isometrically on the canvas.
  Runs in the browser only (DOM APIs); bundled by the server with esbuild.
