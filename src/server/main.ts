/* START
 * Entry point for `npm run serve`: builds the test board, starts the
 * server, and prints its URL.
 * END */

import { buildBoard } from "../../boards/test-board.js";
import { DEFAULT_PORT, startServer } from "./server.js";

startServer(buildBoard(), DEFAULT_PORT).then(() => {
  console.log(`serving on http://127.0.0.1:${DEFAULT_PORT}`);
});
