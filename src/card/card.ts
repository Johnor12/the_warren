/* START
 * The abstract Card base class for all game cards.
 * - Card: subclasses must provide widthMm/heightMm dimensions and front/back
 *   Images. assertValid() enforces the invariant that both face Images'
 *   pixel dimensions match the card's physical dimensions.
 *   Overridable interaction handlers: onDoubleClick (default: flip the card)
 *   and onDoubleRightClick (default: rotate to the next 45° stop). Click +
 *   drag movement/rotation is core behavior, not defined here.
 * - PieceState: the mutable on-board state handlers receive (position,
 *   rotation, which face is up).
 * - normalizeDeg(deg): normalize an angle into [0, 360).
 * - CARD_THICKNESS_MM: fixed card height, for isometric rendering only.
 * END */

import { Image } from "../image/image.js";
import { mmToPx } from "../units/units.js";

export const CARD_THICKNESS_MM = 0.3;

// The mutable state of a piece on the board, as seen by interaction handlers.
export interface PieceState {
  xMm: number; // center of the piece
  yMm: number;
  rotationDeg: number; // rotation about the piece center, relative to the board
  faceUp: boolean; // true when the front image is visible
}

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export abstract class Card {
  abstract readonly widthMm: number;
  abstract readonly heightMm: number;
  abstract readonly front: Image;
  abstract readonly back: Image;

  // Double (left) click: flip the card over.
  onDoubleClick(piece: PieceState): void {
    piece.faceUp = !piece.faceUp;
  }

  // Double right click: rotate 45°. If the card sits between 45° stops
  // (after a free rotation), align with the nearest stop instead.
  onDoubleRightClick(piece: PieceState): void {
    const nearest = Math.round(piece.rotationDeg / 45) * 45;
    const atStop = Math.abs(piece.rotationDeg - nearest) < 1e-9;
    piece.rotationDeg = normalizeDeg(atStop ? nearest + 45 : nearest);
  }

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
