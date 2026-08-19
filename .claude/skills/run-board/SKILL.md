---
name: run-board
description: Launch the board server and verify UI rendering headlessly — screenshots and mouse interactions via tools/drive.ts. Use when asked to run the app or confirm a rendering/interaction change works in the real browser.
---

# Run and verify the board UI

The app is a localhost web server (`src/server/`) rendering the board from
`boards/test-board.ts` onto a full-window canvas. Verification = serve it,
drive headless Edge against it with `tools/drive.ts`, and **look at the
screenshots**.

## 1. Start the server

Port 3000 is often still held by a previous session's server — free it
first (killing it is safe; board state is in-memory and throwaway):

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }
```

Then start in the background and poll until it serves:

```bash
npm run serve   # background it
timeout 30 bash -c 'until curl -sf http://127.0.0.1:3000/board.json >/dev/null; do sleep 1; done'
```

`/board.json` is also the quickest state check (piece positions, rotation,
faceUp) — server state is authoritative after interactions.

## 2. Drive it

```bash
npm run drive -- overview.png wheel:640:360:-1500 zoom.png dblclick:640:360 flipped.png
```

Ops, all numbers colon-separated (commas are eaten by npm on Windows):
`<name>.png` (screenshot to `out/ui/`), `dblclick:x:y` (flip card),
`rdblclick:x:y` (snap-rotate 45°), `drag:x1:y1:x2:y2` (move piece / pan),
`rdrag:...` (spin piece / rotate camera), `wheel:x:y:dy` (negative dy =
zoom in), `wait:ms`. The driver exits non-zero on page errors. Read the
screenshot files — a blank/dark frame means the page failed to draw.

## 3. Finding a piece on screen

The driver uses a 1280x720 viewport. For the default 500x500mm board at
initial camera (yaw 0), world (x, y) mm projects to screen:

```
sx = 640 + (x - y) * 0.86603 * 1.28
sy =  40 + (x + y) * 0.5     * 1.28
```

General case: s = min(1200 / ((W+H)*cos30°), 640 / ((W+H)*sin30°)),
offsetX = 640 - (W-H)*cos30°*s/2, offsetY = 360 - (W+H)*sin30°*s/2, then
sx = offsetX + (x-y)*cos30°*s, sy = offsetY + (x+y)*sin30°*s (mirrors
`fitCamera`/`project` in `src/render/camera.ts`).

## Gotchas

- The server bundles the client at startup — restart it after editing
  `src/render/client.ts` or any board/renderer code.
- Board state resets on every server restart (it lives in memory).
- The driver ignores the favicon 404 (no favicon route); any other console
  error fails the run.
- Requires installed Edge (Playwright `msedge` channel — no downloaded
  browser). If Edge is missing, `npx playwright install chromium` and
  switch the `channel` in `tools/drive.ts` to a plain `chromium.launch`.
