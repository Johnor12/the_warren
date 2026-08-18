# image — maintainer notes

- `image.ts` — the `Image` class (RGBA pixel buffer) and `Color` type; pixel
  writes, fills, and paint composition.
- `create.ts` — `solidImage` and `textImage` generator utilities.
- `font.ts` — embedded 5x7 pixel font data and `glyphColumns` lookup, used by
  `textImage`.
- `png.ts` — `saveImageAsPng` PNG file export (pngjs).
