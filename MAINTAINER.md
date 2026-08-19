# the_warren — technical map

A playtesting tool for board game prototyping: components are defined in
TypeScript (object-oriented, with inheritance), composed into a board object,
and (eventually) rendered and manipulated in a web UI. See `README.md` for
the full product vision. Current state: component/image/board core plus a
v0 isometric renderer (static scene served in the browser); no interaction
or physics yet.

## Layout

- `src/units/` — mm <-> pixel conversion (`PX_PER_MM`, `mmToPx`, `pxToMm`).
- `src/image/` — the `Image` RGBA bitmap class, paint composition, and
  generators (`solidImage`, `textImage`, embedded 5x7 font, PNG export).
- `src/card/` — the abstract `Card` base class (mm dimensions + front/back
  Image invariant).
- `src/board/` — the `Board` class: places validated cards at mm coordinates
  with z-indexes, producing the completed board object.
- `src/render/` — the isometric renderer: `BoardDto` types, board
  serialization for the server, and `client.ts`, the browser canvas
  renderer (fixed camera, painter's algorithm).
- `src/server/` — the localhost web server (`startServer(board)`,
  `npm run serve`): serves the renderer page, the esbuild-bundled client,
  `/board.json`, and piece face PNGs.
- `boards/` — user-written board definition scripts; `test-board.ts` is the
  smoke test, exporting `buildBoard()` (served by `npm run serve`; run
  directly it exports face images to `out/`).

Each directory has its own README.md (external API) and MAINTAINER.md
(per-file responsibilities).

## Tooling

- TypeScript (strict, `noEmit`), run directly with `tsx`.
- ES modules (`"type": "module"`, NodeNext): relative imports must use the
  `.js` extension.
- `npm run typecheck` / `npm run test-board` / `npm run serve`.
- Runtime-relevant dependencies: `pngjs` (PNG encoding), `esbuild`
  (bundles the browser client at server startup).
