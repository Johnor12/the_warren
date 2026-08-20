# the_warren — technical map

A playtesting tool for board game prototyping: components are defined in
TypeScript (object-oriented, with inheritance), composed into a board object,
and rendered and manipulated in a web UI. See `README.md` for the full
product vision. Current state: component/image/board core plus an isometric
renderer with camera controls (pan, zoom, rotate) and card interaction
(drag to move with a visual lift, right-drag to rotate, double click to
flip, double right click to snap-rotate 45°; the double clicks are
overridable Card handlers). Cards can be non-rectangular (an overridable
outline polygon, e.g. hexagons) and any size; face bitmaps map to the
card's 2D shape (opaque only inside the outline, enforced on placement)
and can be imported from PNG files. Overlapping pieces stack in arrival
order (z-indexes resolved by the Board): clicks hit the topmost piece,
moving a piece carries everything stacked on top of it and floats the
stack over whatever it passes, and rotate/flip affect only the one piece.

## Layout

- `src/units/` — mm <-> pixel conversion (`PX_PER_MM`, `mmToPx`, `pxToMm`).
- `src/geometry/` — pure 2D polygon math (`pointInPolygon`, scanline
  `rowSpans`, `polygonsOverlap`), shared by card validation, image
  rasterization, hit testing, and stacking overlap checks.
- `src/image/` — the `Image` RGBA bitmap class, paint composition,
  generators (`solidImage`, `textImage`, embedded 5x7 font, bilinear
  `scaledImage`, `polygonImage` shape fill, `maskedImage`), and PNG
  import/export.
- `src/card/` — the abstract `Card` base class (mm dimensions, overridable
  shape outline with rectangle/hexagon builders, front/back Images that
  must map to the shape, overridable double-click interaction handlers).
- `src/board/` — the `Board` class: places validated cards at mm coordinates
  with z-indexes, producing the completed board object, and the core
  move/rotate piece mutations; `stacking.ts` holds the pure stacking rules
  (overlap, carried stacks, z resolution), shared with the browser client.
- `src/render/` — the isometric renderer: `BoardDto` types, board
  serialization for the server, the pure camera model, scene builder, and
  hit testing (unit tested), and `client.ts`, the browser shell mapping
  mouse input to camera mutations and piece interactions and rasterizing
  the scene.
- `src/server/` — the localhost web server (`startServer(board)`,
  `npm run serve`): serves the renderer page, the esbuild-bundled client,
  `/board.json`, piece face PNGs, and the POST piece interaction routes.
- `boards/` — user-written board definition scripts and their `assets/`
  PNGs; `test-board.ts` is the smoke test (standard, hexagonal, oversized,
  and PNG-faced cards, plus a 10-card deck for stacking), exporting
  `buildBoard()` (served by `npm run serve`; run directly it exports face
  images to `out/`).
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
