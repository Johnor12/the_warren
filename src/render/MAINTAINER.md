# render — maintainer notes

- `types.ts` — `BoardDto` / `PieceDto`, the JSON contract between server
  and browser.
- `serialize.ts` — `boardToDto` (Board -> BoardDto) and `pieceFaceImage`
  (face URL -> Image) for the server.
- `camera.ts` — the pure camera model: `Camera`, `fitCamera`,
  `project`/`unproject`, and the mutations `pan`, `zoomAbout`,
  `rotateAbout`. DOM-free so mutations are unit testable.
- `camera.test.ts` — unit tests for the camera model's invariants.
- `scene.ts` — `buildScene(board, cam)`: turns a BoardDto + Camera into
  ordered 2D draw ops (polygons and face-image quads), including the
  painter's-algorithm sort and visible-side-face selection. DOM-free.
- `scene.test.ts` — builds a real Board, applies camera mutations, and
  asserts the resulting draw ops.
- `client.ts` — the browser shell: fetches `/board.json`, loads face
  images, maps mouse input (left-drag pan, wheel zoom, right-drag rotate)
  to camera mutations, and rasterizes scene ops onto the canvas.
  Runs in the browser only (DOM APIs); bundled by the server with esbuild.
