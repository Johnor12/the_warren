# boards

User-written board definition scripts. Each script defines component classes
(inheriting from the system's base types), composes their images, and places
pieces on a `Board`. Run one with `npx tsx boards/<name>.ts`.

## Scripts

- `test-board.ts` — smoke test: four cards spread on a 500x500mm board,
  covering the card variations (standard, hexagonal, oversized, and
  PNG-imported faces). Exports `buildBoard()` (used by `npm run serve`);
  run directly (`npm run test-board`) it prints the board and exports the
  face images.
- `assets/` — PNG files imported by board scripts for card faces.
