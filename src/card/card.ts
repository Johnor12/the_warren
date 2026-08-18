/* START
 * The abstract Card base class for all game cards.
 * - Card: subclasses must provide widthMm/heightMm dimensions and front/back
 *   Images. assertValid() enforces the invariant that both face Images'
 *   pixel dimensions match the card's physical dimensions.
 * - CARD_THICKNESS_MM: fixed card height, for isometric rendering only.
 * END */

import { Image } from "../image/image";
import { mmToPx } from "../units/units";

export const CARD_THICKNESS_MM = 0.3;

export abstract class Card {
  abstract readonly widthMm: number;
  abstract readonly heightMm: number;
  abstract readonly front: Image;
  abstract readonly back: Image;

  assertValid(): void {
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
  }
}
