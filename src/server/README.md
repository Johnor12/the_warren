# server

The local web server: serves the isometric renderer website for a completed
`Board`.

## API

- `startServer(board, port?)` — serve the given board's renderer on
  `127.0.0.1` (default port 3000); resolves with the running `http.Server`
  (call `.close()` to stop).
- `DEFAULT_PORT` — the default port (3000).
- `npm run serve` — build the test board (`boards/test-board.ts`) and serve
  it from the command line.

## Routes

- `/` — the renderer page (canvas + client script).
- `/client.js` — the bundled browser renderer (`src/render/client.ts`).
- `/board.json` — the serialized board (`BoardDto`).
- `/pieces/<id>/<front|back>.png` — piece face images.
