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
- `saveImageAsPng(image, path)` — export an Image to a PNG file.
