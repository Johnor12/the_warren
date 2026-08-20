/* START
 * The localhost web server: serves the isometric renderer for a Board and
 * applies piece interactions to it.
 * - DEFAULT_PORT: the port used when none is given.
 * - startServer(board, port?): serve the given Board on 127.0.0.1;
 *   resolves with the running http.Server (close it to stop). Routes:
 *   / (HTML shell), /client.js (esbuild-bundled browser renderer),
 *   /board.json (serialized board), /pieces/<id>/<face>.png (face images),
 *   and POST /pieces/<id>/<action> piece interactions.
 * - handlePieceAction(): applies one interaction: move/rotate via the
 *   Board's core methods, double-click/double-right-click via the card's
 *   overridable handlers; responds with every piece's updated state
 *   (a move can restack pieces beyond the moved one).
 * END */

import http from "node:http";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { Board } from "../board/board.js";
import { encodeImageAsPng } from "../image/png.js";
import { boardToDto, pieceFaceImage, pieceUpdatesToDto } from "../render/serialize.js";

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
    const action = url.match(/^\/pieces\/(\d+)\/(move|rotate|double-click|double-right-click)$/);
    if (action && req.method === "POST") {
      handlePieceAction(board, Number(action[1]), action[2], req, res).catch((err) =>
        respond(res, 400, "text/plain", String(err)),
      );
      return;
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

async function handlePieceAction(
  board: Board,
  id: number,
  action: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const piece = board.piece(id);
  if (!piece) return respond(res, 404, "text/plain", "not found");
  const body = (await readJson(req)) as Record<string, unknown>;
  if (action === "move") board.movePiece(id, num(body.xMm), num(body.yMm));
  else if (action === "rotate") board.rotatePiece(id, num(body.rotationDeg));
  else if (action === "double-click") piece.card.onDoubleClick(piece);
  else piece.card.onDoubleRightClick(piece);
  respond(res, 200, "application/json", JSON.stringify(pieceUpdatesToDto(board)));
}

function readJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function num(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`expected a number, got ${JSON.stringify(value)}`);
  return n;
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
