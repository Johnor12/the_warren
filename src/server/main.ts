/* START
 * Entry point for `npm run serve`: starts the server and prints its URL.
 * END */

import { DEFAULT_PORT, startServer } from "./server.js";

startServer(DEFAULT_PORT).then(() => {
  console.log(`serving on http://127.0.0.1:${DEFAULT_PORT}`);
});
