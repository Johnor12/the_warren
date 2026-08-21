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
- `scene.ts` — `buildScene(board, cam, drag?)`: turns a BoardDto + Camera
  into ordered 2D draw ops. Physical piece heights come from
  `stackBottoms` (src/board/stacking.ts), so mixed thicknesses and tiered
  shapes stack correctly. Cards emit side polygons + a face-image quad
  (face bitmaps carry the card shape via transparency, so no clipping);
  objects emit per-prism shaded side polygons + a top polygon in the
  surface color. Honors piece rotation, faceUp, and drag state (each
  dragged piece renders at its own landing height from the Drag's
  bottomsMm map — a carried piece over a taller settled piece is shown
  resting on it). Draw order comes from `paintOrder`, a physical occlusion
  sort: pieces with overlapping footprints draw bottom-up, disjoint ones
  far-to-near (a footprint swept along the view direction hitting another
  means it's behind), applied as a topological sort with a screen
  bounding-box prescreen — z-indexes only order pieces within a stack and
  are never compared across stacks. Also visible-side selection (one side
  face per outline edge), `pickPiece` (screen point -> frontmost piece
  whose projected silhouette — top/bottom/side faces of the outline
  extrusion — contains it), `resolveDrag` (cursor read on the fixed grab
  plane for 1:1 motion; returns the position plus each stack member's
  landing height there), and `pieceTopMm(pieces, piece)`. DOM-free.
- `scene.test.ts` — builds a real Board, applies camera mutations and piece
  state, and asserts the resulting draw ops and hit tests, including stack
  draw order, a dragged piece rendering at its drop height over a stack,
  occlusion ordering (near tall piece over a far stack's raised cards; a
  resting card over its support cube against view depth), topmost-piece
  and side-face picking, object prism rendering/shading, card-on-cube and
  card-on-tier heights, and resolveDrag (grab-plane reads, per-piece
  landing heights with a carried card previewing onto a settled cube, no
  dead zone across edges).
- `client.ts` — the browser shell: fetches `/board.json`, loads card face
  images, runs the gesture state machine (camera pan/zoom/orbit on empty
  board; piece move drags carrying the stack via `src/board/stacking.ts`,
  positioned each mousemove by scene.ts `resolveDrag` and rendered at the
  resolved per-piece landing heights, rotate drags, and double-click
  POSTs on pieces), restacks z-indexes locally on drop (shared `resolveZ`, so the
  release frame matches the server result — no flicker while the POST is
  in flight), applies the all-pieces POST responses, and rasterizes scene ops
  onto the canvas. Runs in the browser only (DOM APIs); bundled by the
  server with esbuild.
