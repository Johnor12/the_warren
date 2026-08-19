# image — maintainer notes

- `image.ts` — the `Image` class (RGBA pixel buffer) and `Color` type; pixel
  writes, fills, and paint composition.
- `create.ts` — generator utilities: `solidImage`, `textImage`,
  `scaledImage` (bilinear resize), `polygonImage` (shape fill), and
  `maskedImage` (transparency outside a polygon). The polygon rasterizers
  sample pixel centers via geometry `rowSpans`, matching the card
  shape-mapping validation.
- `font.ts` — embedded 5x7 pixel font data and `glyphColumns` lookup, used by
  `textImage`.
- `png.ts` — `loadPngAsImage` import and `encodeImageAsPng`/`saveImageAsPng`
  export (pngjs).
