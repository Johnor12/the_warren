/* START
 * The localhost web server (v0: not yet connected to the board system).
 * - DEFAULT_PORT: the port used when none is given.
 * - startServer(port?): starts an HTTP server bound to 127.0.0.1 that
 *   responds "hello world" to every request; resolves with the running
 *   http.Server (close it to stop).
 * END */

import http from "node:http";

export const DEFAULT_PORT = 3000;

export function startServer(port: number = DEFAULT_PORT): Promise<http.Server> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("hello world");
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
