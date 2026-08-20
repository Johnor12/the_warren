/* START
 * The abstract Card base class for all game cards.
 * - Card extends Component (src/component/): subclasses must provide
 *   widthMm/heightMm dimensions and front/back Images. assertValid()
 *   enforces the invariants: both face Images' pixel dimensions match the
 *   card's physical dimensions, the outline is a valid polygon inside those
 *   dimensions, and the face bitmaps map to the card's 2D shape — every
 *   opaque pixel lies inside the outline (build shaped faces with
 *   polygonImage/maskedImage from src/image/).
 *   outlineMm() defines the card's 2D shape as a polygon in card-local mm
 *   coordinates (origin at the card center); default: the full rectangle.
 *   outlinePx() is the same polygon in face-image pixel coordinates
 *   (top-left origin), for building and checking face bitmaps.
 *   onDoubleClick (overridable) flips the card; the inherited
 *   onDoubleRightClick snap-rotates 45°.
 * - CARD_THICKNESS_MM: fixed card height, for isometric rendering only.
 * END */

import { Component, Outline, PieceState, rectangleOutline } from "../component/component.js";
import { Polygon, rowSpans } from "../geometry/polygon.js";
import { Image } from "../image/image.js";
import { mmToPx, PX_PER_MM } from "../units/units.js";

export const CARD_THICKNESS_MM = 0.3;

// The first pixel whose alpha is non-zero and whose center lies outside the
// polygon, or undefined. Samples pixel centers, matching polygonImage/
// maskedImage, so images built with those always pass.
function opaquePixelOutside(image: Image, polygon: Polygon): [number, number] | undefined {
  for (let y = 0; y < image.height; y++) {
    const spans = rowSpans(polygon, y + 0.5);
    for (let x = 0; x < image.width; x++) {
      if (image.pixels[(y * image.width + x) * 4 + 3] === 0) continue;
      if (!spans.some(([x0, x1]) => x + 0.5 >= x0 && x + 0.5 <= x1)) return [x, y];
    }
  }
  return undefined;
}

export abstract class Card extends Component {
  abstract readonly widthMm: number;
  abstract readonly heightMm: number;
  abstract readonly front: Image;
  abstract readonly back: Image;

  readonly thicknessMm = CARD_THICKNESS_MM;

  // The card's 2D shape. Override for non-rectangular cards; face bitmaps
  // must map to it (opaque pixels only inside the outline).
  outlineMm(): Outline {
    return rectangleOutline(this.widthMm, this.heightMm);
  }

  // The outline in face-image pixel coordinates (top-left origin), for
  // building and checking face bitmaps.
  outlinePx(): Polygon {
    return this.outlineMm().map(([x, y]) => [
      (x + this.widthMm / 2) * PX_PER_MM,
      (y + this.heightMm / 2) * PX_PER_MM,
    ]);
  }

  // Double (left) click: flip the card over.
  override onDoubleClick(piece: PieceState): void {
    piece.faceUp = !piece.faceUp;
  }

  override assertValid(): void {
    super.assertValid();
    const width = mmToPx(this.widthMm);
    const height = mmToPx(this.heightMm);
    const faces = [
      ["front", this.front],
      ["back", this.back],
    ] as const;
    for (const [name, face] of faces) {
      if (face.width !== width || face.height !== height) {
        throw new Error(
          `${this.constructor.name} ${name} image is ${face.width}x${face.height}px, ` +
            `expected ${width}x${height}px for ${this.widthMm}x${this.heightMm}mm`,
        );
      }
    }

    for (const [x, y] of this.outlineMm()) {
      if (Math.abs(x) > this.widthMm / 2 || Math.abs(y) > this.heightMm / 2) {
        throw new Error(
          `${this.constructor.name} outline point (${x}, ${y})mm is outside ` +
            `the ${this.widthMm}x${this.heightMm}mm card`,
        );
      }
    }

    const outlinePx = this.outlinePx();
    for (const [name, face] of faces) {
      const offender = opaquePixelOutside(face, outlinePx);
      if (offender) {
        throw new Error(
          `${this.constructor.name} ${name} image is opaque at (${offender[0]}, ` +
            `${offender[1]})px, outside the card outline; face bitmaps must map ` +
            `to the card's 2D shape (build them with polygonImage/maskedImage)`,
        );
      }
    }
  }
}
