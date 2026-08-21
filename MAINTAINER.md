# the_warren — technical map

A playtesting tool for board game prototyping: components are defined in
TypeScript (object-oriented, with inheritance), composed into a board object,
and rendered and manipulated in a web UI. See `README.md` for the full
product vision. Current state: component/image/board core plus an isometric
renderer with camera controls (pan, zoom, rotate) and piece interaction
(drag to move — the piece renders where it would land if dropped at that
moment — right-drag to rotate, double click to flip cards, double right
click to snap-rotate 45°; the double clicks are overridable Component
handlers). Cards can be non-rectangular (an
overridable outline polygon, e.g. hexagons) and any size; face bitmaps map
to the card's 2D shape (opaque only inside the outline, enforced on
placement) and can be imported from PNG files. 3D objects (`GameObject`)
share the movement/rotation/stacking systems: a length x width x height
bounding box (default 8mm cube) drives stacking and inputs, and an
overridable prism shape inside it renders in a single surface color.
Overlapping pieces stack in arrival order (z-indexes resolved by the
Board): clicks hit the topmost piece anywhere on its visible body (top or
side faces), moving a piece carries everything physically resting on it
(not pieces merely overlapped from above — an overhanging card stays with
its own stack) and shows every stack member where it would land if
dropped right now (a carried card passing over a taller piece is shown
settling onto it while the stack stays whole for the rest of the drag),
and rotate/flip affect only the one piece. Pieces rest on actual shapes,
not bounding boxes: heights honor mixed thicknesses (a card on an 8mm
cube sits at 8mm) and shape prisms (on a tiered object's low tier, a card
sits at that tier's top), draw order is a physical occlusion sort (a near
tall piece draws over a far stack's raised cards), and a piece dropped
over another's body lands on top of it, never inside it.

## Layout

- `src/units/` — mm <-> pixel conversion (`PX_PER_MM`, `mmToPx`, `pxToMm`).
- `src/geometry/` — pure 2D polygon math (`pointInPolygon`, scanline
  `rowSpans`, `polygonsOverlap`, `convexHull`), shared by card validation,
  image rasterization, hit testing, stacking overlap checks, and the
  renderer's occlusion sort.
- `src/image/` — the `Image` RGBA bitmap class, paint composition,
  generators (`solidImage`, `textImage`, embedded 5x7 font, bilinear
  `scaledImage`, `polygonImage` shape fill, `maskedImage`), and PNG
  import/export.
- `src/component/` — the abstract `Component` base class shared by cards
  and objects (footprint outline with rectangle/hexagon builders, vertical
  thickness, overridable double-click handlers with the default 45° snap
  rotation, `PieceState`).
- `src/card/` — the abstract `Card` class (mm dimensions, overridable
  shape outline, front/back Images that must map to the shape, the flip
  double-click handler, fixed 0.3mm thickness).
- `src/object/` — the `GameObject` class for 3D pieces (bounding box
  defaulting to an 8mm cube, overridable prism `shapeMm()`, surface color).
- `src/board/` — the `Board` class: places validated components at mm
  coordinates with z-indexes, producing the completed board object, and
  the core move/rotate piece mutations; `stacking.ts` holds the pure
  stacking rules (overlap, carried stacks, z resolution, physical stack
  heights), shared with the browser client.
- `src/render/` — the isometric renderer: `BoardDto` types (card/object
  union), board serialization for the server, the pure camera model, scene
  builder (card faces + shaded object prisms), and hit testing (unit
  tested), and `client.ts`, the browser shell mapping mouse input to
  camera mutations and piece interactions and rasterizing the scene.
- `src/server/` — the localhost web server (`startServer(board)`,
  `npm run serve`): serves the renderer page, the esbuild-bundled client,
  `/board.json`, card face PNGs, and the POST piece interaction routes.
- `boards/` — user-written board definition scripts and their `assets/`
  PNGs; `test-board.ts` is the smoke test (standard, hexagonal, oversized,
  and PNG-faced cards, a 10-card deck for stacking, colored cubes — one
  stacked on another, a two-tier tower object, and a card resting on a
  cube), exporting `buildBoard()` (served by `npm run serve`; run directly
  it exports face images to `out/`).
- `tools/` — dev tooling: `drive.ts`, the headless UI driver (Playwright +
  installed Edge) behind `npm run drive`, for agent-driven screenshot
  verification of the running server. Recipe: `.claude/skills/run-board/`.

Each directory has its own README.md (external API) and MAINTAINER.md
(per-file responsibilities).

## Tooling

- TypeScript (strict, `noEmit`), run directly with `tsx`.
- ES modules (`"type": "module"`, NodeNext): relative imports must use the
  `.js` extension.
- `npm run typecheck` / `npm test` / `npm run test-board` / `npm run serve`
  / `npm run drive` (headless UI verification; see `tools/`).
- Runtime-relevant dependencies: `pngjs` (PNG encoding), `esbuild`
  (bundles the browser client at server startup), `playwright` (dev only,
  drives installed Edge for `npm run drive` — no downloaded browser).
