# render — maintainer notes

- `types.ts` — `BoardDto` / `PieceDto` (a discriminated union: `CardDto`
  with dimensions + face URLs, `ObjectDto` with color + `PrismDto[]`) /
  `PieceStateDto` / `PieceUpdateDto`, the JSON contract between server
  and browser.
- `serialize.ts` — `boardToDto` (Board -> BoardDto, branching on Card vs
  GameObject), `pieceUpdatesToDto` (interaction POST responses: every
  piece's state, since moves restack), and `pieceFaceImage` (face URL ->
  Image, cards only) for the server.
- `camera.ts` — the pure camera model: `Camera`, `fitCamera`,
  `project`/`unproject` (unproject takes an optional plane height), and
  the mutations `pan`, `zoomAbout`, `rotateAbout`. DOM-free so mutations
  are unit testable.
- `camera.test.ts` — unit tests for the camera model's invariants.
- `scene.ts` — `buildScene(board, cam, lift?)`: turns a BoardDto + Camera
  into ordered 2D draw ops. Physical piece heights come from
  `stackBottoms` (src/board/stacking.ts), so mixed thicknesses stack
  correctly. Cards emit side polygons + a face-image quad (face bitmaps
  carry the card shape via transparency, so no clipping); objects emit
  per-prism shaded side polygons + a top polygon in the surface color.
  Honors piece rotation, faceUp, z-index, and lift state (the dragged
  stack, floating at the Lift's explicit base height with in-stack heights
  preserved, drawn above everything), including the painter's-algorithm
  sort (z-index, then view depth, lifted last) and visible-side selection
  (one side face per outline edge). Also `pickPiece` (screen point ->
  topmost piece whose projected silhouette — top/bottom/side faces of the
  outline extrusion — contains it), `resolveDrag` (height-aware drag: the
  cursor read against each candidate support height, highest consistent
  interpretation wins, undefined over inconsistent slivers), and
  `pieceTopMm(pieces, piece)`. DOM-free.
- `scene.test.ts` — builds a real Board, applies camera mutations and piece
  state, and asserts the resulting draw ops and hit tests, including stack
  draw order, a lifted piece floating over a tall stack, topmost-piece and
  side-face picking, object prism rendering/shading, card-on-cube heights,
  and resolveDrag support resolution.
- `client.ts` — the browser shell: fetches `/board.json`, loads card face
  images, runs the gesture state machine (camera pan/zoom/orbit on empty
  board; piece move drags carrying the stack via `src/board/stacking.ts`,
  positioned each mousemove by scene.ts `resolveDrag` and floated LIFT_MM
  above the resolved support, rotate drags, and double-click POSTs on
  pieces), applies the all-pieces POST responses, and rasterizes scene ops
  onto the canvas. Runs in the browser only (DOM APIs); bundled by the
  server with esbuild.
