# server

The local web server that will eventually serve the board-rendering website.
v0: standalone, returns "hello world" for every request.

## API

- `startServer(port?)` — start an HTTP server on `127.0.0.1` (default port
  3000); resolves with the running `http.Server` (call `.close()` to stop).
- `DEFAULT_PORT` — the default port (3000).
- `npm run serve` — start the server from the command line.
