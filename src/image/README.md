# image

2D images as first-class citizens. An `Image` is an RGBA bitmap that can be
composed onto other Images by painting (later paints win). Most real card art
will be produced outside this program; this directory provides the Image type
plus simple built-in generators.

## API

- `Image` — the bitmap class: `width`, `height`, `pixels`, `setPixel`, `fill`,
  `paint(src, x, y)`.
- `Color` — an RGBA color (`{ r, g, b, a }`, channels 0-255).
- `solidImage(width, height, color)` — single-color Image.
- `textImage(text, width, height, color)` — centered text on a transparent
  background, from the embedded 5x7 pixel font.
- `scaledImage(src, width, height)` — resized copy of an Image (bilinear;
  stretches if aspect ratios differ), e.g. to fit an imported bitmap to a
  card face.
- `polygonImage(width, height, polygon, color)` — the polygon filled with
  one color on a transparent background; the base of non-rectangular card
  faces (polygon in pixel coordinates, e.g. `card.outlinePx()`).
- `maskedImage(src, polygon)` — copy of src made fully transparent outside
  the polygon, e.g. to fit imported rectangular art to a card shape.
- `loadPngAsImage(path)` — import a PNG file as an Image.
- `saveImageAsPng(image, path)` — export an Image to a PNG file.
