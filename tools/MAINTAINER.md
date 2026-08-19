# tools — maintainer notes

- `drive.ts` — the headless UI driver: launches installed Edge through
  Playwright's `msedge` channel (no downloaded browser), loads
  `http://127.0.0.1:3000`, applies command-line ops (screenshots, clicks,
  drags, wheel), writes screenshots to `out/ui/`, and fails on page
  console errors (ignoring the expected favicon 404).
