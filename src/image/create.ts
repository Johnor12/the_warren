/* START
 * Utilities for creating simple Images.
 * - solidImage(width, height, color): a width x height Image of one color.
 * - textImage(text, width, height, color): a width x height Image with the
 *   text centered on a transparent background, rendered from the embedded
 *   5x7 font at the largest integer scale that fits.
 * - scaledImage(src, width, height): a resized copy of src (bilinear;
 *   stretches if the aspect ratios differ). Used to fit imported bitmaps
 *   to card face dimensions.
 * - polygonImage(width, height, polygon, color): the polygon filled with
 *   one color on a transparent background (polygon in pixel coordinates,
 *   top-left origin). The base of non-rectangular card faces.
 * - maskedImage(src, polygon): a copy of src that is fully transparent
 *   outside the polygon. Fits imported rectangular art to a card shape.
 * A pixel counts as inside a polygon when its center is; validation in
 * card.ts samples the same way, so these images always pass it.
 * END */

import { Polygon, rowSpans } from "../geometry/polygon.js";
import { Color, Image } from "./image.js";
import { GLYPH_HEIGHT, GLYPH_WIDTH, glyphColumns } from "./font.js";

export function solidImage(width: number, height: number, color: Color): Image {
  const image = new Image(width, height);
  image.fill(color);
  return image;
}

export function textImage(text: string, width: number, height: number, color: Color): Image {
  if (text.length === 0) throw new Error("textImage requires non-empty text");

  // Glyphs are 5 columns wide with a 1-column gap between characters.
  const textCols = text.length * (GLYPH_WIDTH + 1) - 1;
  const scale = Math.floor(Math.min(width / textCols, height / GLYPH_HEIGHT));
  if (scale < 1) {
    throw new Error(`Text "${text}" does not fit in ${width}x${height}px`);
  }

  const image = new Image(width, height); // starts fully transparent
  const originX = Math.floor((width - textCols * scale) / 2);
  const originY = Math.floor((height - GLYPH_HEIGHT * scale) / 2);

  for (let c = 0; c < text.length; c++) {
    const columns = glyphColumns(text[c]);
    const charX = originX + c * (GLYPH_WIDTH + 1) * scale;
    for (let col = 0; col < GLYPH_WIDTH; col++) {
      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        if ((columns[col] >> row) & 1) {
          fillSquare(image, charX + col * scale, originY + row * scale, scale, color);
        }
      }
    }
  }
  return image;
}

export function polygonImage(
  width: number,
  height: number,
  polygon: Polygon,
  color: Color,
): Image {
  const image = new Image(width, height); // starts fully transparent
  for (let y = 0; y < height; y++) {
    for (const [x0, x1] of rowSpans(polygon, y + 0.5)) {
      for (let x = Math.ceil(x0 - 0.5); x + 0.5 <= x1; x++) {
        image.setPixel(x, y, color);
      }
    }
  }
  return image;
}

export function maskedImage(src: Image, polygon: Polygon): Image {
  const out = new Image(src.width, src.height);
  for (let y = 0; y < src.height; y++) {
    const spans = rowSpans(polygon, y + 0.5);
    for (let x = 0; x < src.width; x++) {
      if (!spans.some(([x0, x1]) => x + 0.5 >= x0 && x + 0.5 <= x1)) continue;
      const i = (y * src.width + x) * 4;
      out.pixels.set(src.pixels.subarray(i, i + 4), i);
    }
  }
  return out;
}

export function scaledImage(src: Image, width: number, height: number): Image {
  const out = new Image(width, height);
  const sample = (x: number, y: number, channel: number) =>
    src.pixels[(y * src.width + x) * 4 + channel];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Bilinear: the source position of this destination pixel's center,
      // interpolated between its four surrounding source pixels.
      const sx = Math.max(0, ((x + 0.5) * src.width) / width - 0.5);
      const sy = Math.max(0, ((y + 0.5) * src.height) / height - 0.5);
      const x0 = Math.min(src.width - 1, Math.floor(sx));
      const y0 = Math.min(src.height - 1, Math.floor(sy));
      const x1 = Math.min(src.width - 1, x0 + 1);
      const y1 = Math.min(src.height - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const i = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top = sample(x0, y0, channel) * (1 - fx) + sample(x1, y0, channel) * fx;
        const bottom = sample(x0, y1, channel) * (1 - fx) + sample(x1, y1, channel) * fx;
        out.pixels[i + channel] = top * (1 - fy) + bottom * fy;
      }
    }
  }
  return out;
}

function fillSquare(image: Image, x: number, y: number, size: number, color: Color): void {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      image.setPixel(x + dx, y + dy, color);
    }
  }
}
