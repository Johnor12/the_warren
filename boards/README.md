# boards

User-written board definition scripts. Each script defines component classes
(inheriting from the system's base types), composes their images, and places
pieces on a `Board`. Run one with `npx tsx boards/<name>.ts`.

## Scripts

- `test-board.ts` — smoke test: one white 41x63mm card with "Front"/"Back"
  faces, centered on a 500x500mm board. Exports `buildBoard()` (used by
  `npm run serve`); run directly (`npm run test-board`) it prints the board
  and exports the face images.
