/* START
 * Utilities for creating simple Images.
 * - solidImage(width, height, color): a width x height Image of one color.
 * - textImage(text, width, height, color): a width x height Image with the
 *   text centered on a transparent background, rendered from the embedded
 *   5x7 font at the largest integer scale that fits.
 * END */

import { Color, Image } from "./image";
import { GLYPH_HEIGHT, GLYPH_WIDTH, glyphColumns } from "./font";

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

function fillSquare(image: Image, x: number, y: number, size: number, color: Color): void {
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      image.setPixel(x + dx, y + dy, color);
    }
  }
}
