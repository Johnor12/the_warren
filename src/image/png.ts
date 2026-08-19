/* START
 * PNG export for Images.
 * - encodeImageAsPng(image): encode an Image as a PNG Buffer (for serving
 *   over HTTP).
 * - saveImageAsPng(image, path): write an Image to disk as a PNG, creating
 *   parent directories as needed.
 * END */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import { Image } from "./image.js";

export function encodeImageAsPng(image: Image): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data.set(image.pixels);
  return PNG.sync.write(png);
}

export function saveImageAsPng(image: Image, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeImageAsPng(image));
}
