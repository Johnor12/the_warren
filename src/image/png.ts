/* START
 * PNG export for Images, used for debugging and inspection.
 * - saveImageAsPng(image, path): write an Image to disk as a PNG, creating
 *   parent directories as needed.
 * END */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";
import { Image } from "./image.js";

export function saveImageAsPng(image: Image, path: string): void {
  const png = new PNG({ width: image.width, height: image.height });
  png.data.set(image.pixels);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}
