/* START
 * Board generation: the playing surface and the pieces placed on it.
 * - PlacedPiece: a card on the board with a unique id, center coordinates in
 *   mm, and a z-index (0 = on the table).
 * - Board: playing surface with mm dimensions.
 *   - place(card, xMm, yMm): validate the card and place it (its center) at
 *     the given coordinates; returns the PlacedPiece.
 *   - centerX() / centerY(): the board's center coordinates in mm.
 *   - describe(): human-readable summary of the board for logs.
 * END */

import { Card } from "../card/card.js";

export interface PlacedPiece {
  id: number;
  card: Card;
  xMm: number; // center of the piece
  yMm: number;
  zIndex: number;
}

export class Board {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly pieces: PlacedPiece[] = [];
  private nextId = 1;

  constructor(widthMm: number, heightMm: number) {
    if (widthMm <= 0 || heightMm <= 0) {
      throw new Error(`Board dimensions must be positive, got ${widthMm}x${heightMm}mm`);
    }
    this.widthMm = widthMm;
    this.heightMm = heightMm;
  }

  place(card: Card, xMm: number, yMm: number): PlacedPiece {
    card.assertValid();
    if (xMm < 0 || yMm < 0 || xMm > this.widthMm || yMm > this.heightMm) {
      throw new Error(`(${xMm}, ${yMm})mm is outside the ${this.widthMm}x${this.heightMm}mm board`);
    }
    const piece: PlacedPiece = { id: this.nextId++, card, xMm, yMm, zIndex: 0 };
    this.pieces.push(piece);
    return piece;
  }

  centerX(): number {
    return this.widthMm / 2;
  }

  centerY(): number {
    return this.heightMm / 2;
  }

  describe(): string {
    const lines = [`Board ${this.widthMm}x${this.heightMm}mm, ${this.pieces.length} piece(s):`];
    for (const piece of this.pieces) {
      lines.push(
        `  #${piece.id} ${piece.card.constructor.name} ` +
          `(${piece.card.widthMm}x${piece.card.heightMm}mm) ` +
          `at (${piece.xMm}, ${piece.yMm})mm, z=${piece.zIndex}`,
      );
    }
    return lines.join("\n");
  }
}
