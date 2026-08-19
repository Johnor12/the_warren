/* START
 * PNG import and export for Images.
 * - loadPngAsImage(path): read a PNG file into an Image at its native
 *   pixel dimensions (scale it afterwards to fit a card face).
 * - encodeImageAsPng(image): encode an Image as a PNG Buffer (for serving
 *   over HTTP).
 * - saveImageAsPng(image, path): write an Image to disk as a PNG, creating
 *   parent directories as needed.
 * END */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import { Image } from "./image.js";

export function loadPngAsImage(path: string): Image {
  const png = PNG.sync.read(readFileSync(path)); // pngjs normalizes to 8-bit RGBA
  const image = new Image(png.width, png.height);
  image.pixels.set(png.data);
  return image;
}

export function encodeImageAsPng(image: Image): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data.set(image.pixels);
  return PNG.sync.write(png);
}

export function saveImageAsPng(image: Image, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeImageAsPng(image));
}
