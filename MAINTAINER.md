# the_warren — technical map

A playtesting tool for board game prototyping: components are defined in
TypeScript (object-oriented, with inheritance), composed into a board object,
and (eventually) rendered and manipulated in a web UI. See `README.md` for
the full product vision. Current state: initial component/image/board core;
no rendering or physics yet.

## Layout

- `src/units/` — mm <-> pixel conversion (`PX_PER_MM`, `mmToPx`, `pxToMm`).
- `src/image/` — the `Image` RGBA bitmap class, paint composition, and
  generators (`solidImage`, `textImage`, embedded 5x7 font, PNG export).
- `src/card/` — the abstract `Card` base class (mm dimensions + front/back
  Image invariant).
- `src/board/` — the `Board` class: places validated cards at mm coordinates
  with z-indexes, producing the completed board object.
- `src/server/` — the localhost web server (`startServer`, `npm run serve`);
  v0 hello world, not yet connected to the board system.
- `boards/` — user-written board definition scripts; `test-board.ts` is the
  smoke test (`npm run test-board`, exports face images to `out/`).

Each directory has its own README.md (external API) and MAINTAINER.md
(per-file responsibilities).

## Tooling

- TypeScript (strict, `noEmit`), run directly with `tsx`.
- ES modules (`"type": "module"`, NodeNext): relative imports must use the
  `.js` extension.
- `npm run typecheck` / `npm run test-board`.
- Only runtime-relevant dependency: `pngjs` (debug image export).
