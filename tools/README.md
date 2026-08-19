# tools

Development tooling that is not part of the game system itself. Currently:
headless verification of the rendered board UI, so changes can be checked
in a real browser (screenshots + interactions) without a human at the
screen — primarily for automated testing by agents.

## API

- `npm run drive -- <op> <op> ...` — drive the running board server
  (`npm run serve` first) in headless Edge and screenshot it. Ops (all
  numbers colon-separated): `<name>.png` (screenshot to `out/ui/`),
  `dblclick:x:y`, `rdblclick:x:y`, `drag:x1:y1:x2:y2`, `rdrag:x1:y1:x2:y2`,
  `wheel:x:y:dy`, `wait:ms`. Exits non-zero if the page logged errors.

See `.claude/skills/run-board/SKILL.md` for the full verification recipe
(server lifecycle, screen-coordinate math, gotchas).
