# server — maintainer notes

- `server.ts` — `startServer(board, port?)` / `DEFAULT_PORT`; the HTML
  shell, the esbuild bundling of `src/render/client.ts`, and the routes
  (page, client script, board JSON, face PNGs, and the POST piece
  interaction routes dispatching to Board methods / Card handlers).
- `main.ts` — CLI entry point for `npm run serve`; wires the test board
  from `boards/test-board.ts` into the server (v0 wiring).
