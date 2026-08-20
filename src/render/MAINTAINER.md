# render — maintainer notes

- `types.ts` — `BoardDto` / `PieceDto` / `PieceStateDto` / `PieceUpdateDto`,
  the JSON contract between server and browser.
- `serialize.ts` — `boardToDto` (Board -> BoardDto), `pieceUpdatesToDto`
  (interaction POST responses: every piece's state, since moves restack),
  and `pieceFaceImage` (face URL -> Image) for the server.
- `camera.ts` — the pure camera model: `Camera`, `fitCamera`,
  `project`/`unproject` (unproject takes an optional plane height), and
  the mutations `pan`, `zoomAbout`, `rotateAbout`. DOM-free so mutations
  are unit testable.
- `camera.test.ts` — unit tests for the camera model's invariants.
- `scene.ts` — `buildScene(board, cam, lift?)`: turns a BoardDto + Camera
  into ordered 2D draw ops (polygons and face-image quads; face bitmaps
  carry the card shape via transparency, so no clipping), honoring piece
  rotation, faceUp, z-index, and lift state (the dragged stack, drawn
  above everything), including the painter's-algorithm sort (z-index, then
  view depth, lifted last) and visible-side selection (one side face per
  outline edge). Also `pickPiece` (screen point -> topmost piece via
  point-in-outline) and `pieceTopMm`. DOM-free.
- `scene.test.ts` — builds a real Board, applies camera mutations and piece
  state, and asserts the resulting draw ops and hit tests, including stack
  draw order, a lifted piece floating over a tall stack, and topmost-piece
  picking.
- `client.ts` — the browser shell: fetches `/board.json`, loads face
  images, runs the gesture state machine (camera pan/zoom/orbit on empty
  board; piece move drags carrying the stack above via
  `src/board/stacking.ts`, rotate drags, and double-click POSTs on
  pieces), applies the all-pieces POST responses, and rasterizes scene ops
  onto the canvas. Runs in the browser only (DOM APIs); bundled by the
  server with esbuild.
