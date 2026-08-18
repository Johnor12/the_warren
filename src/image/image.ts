/* START
 * The Image class: a 2D RGBA bitmap, the system's first-class image type.
 * - Color: an RGBA color, each channel 0-255.
 * - Image: pixel buffer with width/height in pixels.
 *   - setPixel(x, y, color): write one pixel (out-of-bounds is ignored).
 *   - fill(color): set every pixel.
 *   - paint(src, x, y): compose another Image onto this one at (x, y).
 *     Later paints win; fully transparent source pixels are skipped.
 * END */

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class Image {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray; // RGBA, row-major

  constructor(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error(`Image dimensions must be positive, got ${width}x${height}`);
    }
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }

  setPixel(x: number, y: number, color: Color): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.pixels[i] = color.r;
    this.pixels[i + 1] = color.g;
    this.pixels[i + 2] = color.b;
    this.pixels[i + 3] = color.a;
  }

  fill(color: Color): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.setPixel(x, y, color);
      }
    }
  }

  paint(src: Image, x: number, y: number): void {
    x = Math.round(x);
    y = Math.round(y);
    for (let sy = 0; sy < src.height; sy++) {
      for (let sx = 0; sx < src.width; sx++) {
        const i = (sy * src.width + sx) * 4;
        if (src.pixels[i + 3] === 0) continue; // transparent: keep what's below
        this.setPixel(x + sx, y + sy, {
          r: src.pixels[i],
          g: src.pixels[i + 1],
          b: src.pixels[i + 2],
          a: src.pixels[i + 3],
        });
      }
    }
  }
}
