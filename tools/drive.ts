/* START
 * Headless UI driver for verifying board rendering: launches the installed
 * Edge browser (via Playwright's msedge channel, no browser download),
 * loads the running board server, and applies a sequence of ops from the
 * command line. For agents and smoke checks, not gameplay.
 * - Usage: npm run drive -- <op> <op> ...  (server must already be running)
 *   All numbers are colon-separated (commas are eaten by npm on Windows):
 *   ops: <name>.png          screenshot to out/ui/<name>.png
 *        dblclick:x:y        double left click (flips the card under x,y)
 *        rdblclick:x:y       double right click (snap-rotates 45°)
 *        drag:x1:y1:x2:y2    left-button drag (move piece / pan camera)
 *        rdrag:x1:y1:x2:y2   right-button drag (spin piece / rotate camera)
 *        wheel:x:y:dy        mouse wheel at (x, y) (negative dy zooms in)
 *        wait:ms             pause
 * - Exits non-zero and prints console/page errors if the page threw
 *   (the expected favicon 404 is ignored).
 * END */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, Page } from "playwright";

const URL = "http://127.0.0.1:3000";
const SHOTS_DIR = join("out", "ui");
const VIEWPORT = { width: 1280, height: 720 };

async function main(): Promise<void> {
  const ops = process.argv.slice(2);
  mkdirSync(SHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    if (msg.location().url.includes("favicon")) return; // no favicon route; expected 404
    errors.push(`${msg.text()} (${msg.location().url})`);
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800); // image preload + first draw

  for (const op of ops) {
    await applyOp(page, op);
    await page.waitForTimeout(300); // let POSTs land and the canvas redraw
  }

  await browser.close();
  if (errors.length > 0) {
    console.error("PAGE ERRORS:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("ok");
}

async function applyOp(page: Page, op: string): Promise<void> {
  const [name, ...rest] = op.split(":");
  const a = rest.map(Number);
  if (op.endsWith(".png")) {
    await page.screenshot({ path: join(SHOTS_DIR, op) });
    console.log(`wrote ${join(SHOTS_DIR, op)}`);
  } else if (name === "dblclick") {
    await page.mouse.dblclick(a[0], a[1]);
  } else if (name === "rdblclick") {
    await page.mouse.dblclick(a[0], a[1], { button: "right" });
  } else if (name === "drag") {
    await drag(page, a, "left");
  } else if (name === "rdrag") {
    await drag(page, a, "right");
  } else if (name === "wheel") {
    await page.mouse.move(a[0], a[1]);
    await page.mouse.wheel(0, a[2]);
  } else if (name === "wait") {
    await page.waitForTimeout(a[0]);
  } else {
    throw new Error(`unknown op ${op}`);
  }
}

async function drag(page: Page, [x1, y1, x2, y2]: number[], button: "left" | "right") {
  await page.mouse.move(x1, y1);
  await page.mouse.down({ button });
  // Several steps so the client's move handler tracks the drag.
  await page.mouse.move(x2, y2, { steps: 8 });
  await page.mouse.up({ button });
}

main();
