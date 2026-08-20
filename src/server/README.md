# server

The local web server: serves the isometric renderer website for a completed
`Board` and applies the player's piece interactions to it.

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
- `POST /pieces/<id>/<action>` — piece interactions; responds with every
  piece's updated state (`PieceUpdateDto[]`, since a move can restack
  pieces beyond the moved one). Actions: `move` (`{xMm, yMm}`, clamped to
  the board, carrying pieces stacked on top) and `rotate` (`{rotationDeg}`)
  call the Board's core methods; `double-click` and `double-right-click`
  (no body) call the card's overridable handlers.
