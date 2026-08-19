/* START
 * The localhost web server: serves the isometric renderer for a Board.
 * - DEFAULT_PORT: the port used when none is given.
 * - startServer(board, port?): serve the given Board on 127.0.0.1;
 *   resolves with the running http.Server (close it to stop). Routes:
 *   / (HTML shell), /client.js (esbuild-bundled browser renderer),
 *   /board.json (serialized board), /pieces/<id>/<face>.png (face images).
 * END */

import http from "node:http";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { Board } from "../board/board.js";
import { encodeImageAsPng } from "../image/png.js";
import { boardToDto, pieceFaceImage } from "../render/serialize.js";

export const DEFAULT_PORT = 3000;

const PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>the warren</title>
<style>html, body { margin: 0; height: 100%; overflow: hidden; background: #1e242b; }</style>
</head>
<body><canvas id="board"></canvas><script src="/client.js"></script></body>
</html>`;

function bundleClient(): string {
  const entry = fileURLToPath(new URL("../render/client.ts", import.meta.url));
  const result = buildSync({ entryPoints: [entry], bundle: true, format: "iife", write: false });
  return result.outputFiles[0].text;
}

export function startServer(board: Board, port: number = DEFAULT_PORT): Promise<http.Server> {
  const clientJs = bundleClient();

  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    if (url === "/") return respond(res, 200, "text/html", PAGE);
    if (url === "/client.js") return respond(res, 200, "text/javascript", clientJs);
    if (url === "/board.json") {
      return respond(res, 200, "application/json", JSON.stringify(boardToDto(board)));
    }
    const face = url.match(/^\/pieces\/(\d+)\/(front|back)\.png$/);
    if (face) {
      const image = pieceFaceImage(board, Number(face[1]), face[2] as "front" | "back");
      if (image) return respond(res, 200, "image/png", encodeImageAsPng(image));
    }
    respond(res, 404, "text/plain", "not found");
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function respond(
  res: http.ServerResponse,
  status: number,
  type: string,
  body: string | Buffer,
): void {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}
