/* START
 * The abstract Card base class for all game cards.
 * - Card: subclasses must provide widthMm/heightMm dimensions and front/back
 *   Images. assertValid() enforces the invariants: both face Images' pixel
 *   dimensions match the card's physical dimensions, the outline is a valid
 *   polygon inside those dimensions, and the face bitmaps map to the card's
 *   2D shape — every opaque pixel lies inside the outline (build shaped
 *   faces with polygonImage/maskedImage from src/image/).
 *   outlineMm() defines the card's 2D shape as a polygon in card-local mm
 *   coordinates (origin at the card center); default: the full rectangle.
 *   outlinePx() is the same polygon in face-image pixel coordinates
 *   (top-left origin), for building and checking face bitmaps.
 *   Overridable interaction handlers: onDoubleClick (default: flip the card)
 *   and onDoubleRightClick (default: rotate to the next 45° stop). Click +
 *   drag movement/rotation is core behavior, not defined here.
 * - Outline: a polygon as [x, y] points; edges wind so that edge p1 -> p2
 *   has outward normal (dy, -dx).
 * - rectangleOutline(w, h) / hexagonOutline(w, h): outline builders; the
 *   hexagon has vertices on the left/right and flat top/bottom edges.
 * - PieceState: the mutable on-board state handlers receive (position,
 *   rotation, which face is up).
 * - normalizeDeg(deg): normalize an angle into [0, 360).
 * - CARD_THICKNESS_MM: fixed card height, for isometric rendering only.
 * END */

import { Polygon, rowSpans } from "../geometry/polygon.js";
import { Image } from "../image/image.js";
import { mmToPx, PX_PER_MM } from "../units/units.js";

export const CARD_THICKNESS_MM = 0.3;

// A card's 2D shape: [x, y] mm points around the card center, wound so that
// edge p1 -> p2 has outward normal (dy, -dx).
export type Outline = Polygon;

export function rectangleOutline(widthMm: number, heightMm: number): Outline {
  const w = widthMm / 2;
  const h = heightMm / 2;
  return [
    [-w, -h],
    [w, -h],
    [w, h],
    [-w, h],
  ];
}

// A hexagon inscribed in widthMm x heightMm: vertices at the left and right,
// flat top and bottom edges. Regular when widthMm ≈ heightMm * 2 / sqrt(3).
export function hexagonOutline(widthMm: number, heightMm: number): Outline {
  const w = widthMm / 2;
  const h = heightMm / 2;
  return [
    [-w, 0],
    [-w / 2, -h],
    [w / 2, -h],
    [w, 0],
    [w / 2, h],
    [-w / 2, h],
  ];
}

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

export abstract class Card {
  abstract readonly widthMm: number;
  abstract readonly heightMm: number;
  abstract readonly front: Image;
  abstract readonly back: Image;

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

    const outline = this.outlineMm();
    if (outline.length < 3) {
      throw new Error(`${this.constructor.name} outline has ${outline.length} points, need >= 3`);
    }
    for (const [x, y] of outline) {
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
