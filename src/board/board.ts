/* START
 * Board generation: the playing surface and the pieces placed on it.
 * - PlacedPiece: a component on the board with a unique id, a z-index (0 =
 *   on the table), its cached outline and thickness, and its mutable
 *   PieceState (center mm coordinates, rotation, which face is up).
 * - Board: playing surface with mm dimensions.
 *   - place(component, xMm, yMm): validate the component (Card or
 *     GameObject) and place it (its center) at the given coordinates,
 *     stacking on top of anything it overlaps; returns the PlacedPiece.
 *   - piece(id): look up a placed piece.
 *   - movePiece(id, xMm, yMm): move the piece (clamped to the board) and
 *     everything stacked on top of it, then re-resolve z-indexes so the
 *     moved stack lands on top of whatever it now overlaps.
 *   - rotatePiece(id, rotationDeg): rotate one piece (normalized angle);
 *     rotation never restacks. Neither move nor rotate is routed through
 *     Component handlers, so subclasses cannot override them.
 *   - centerX() / centerY(): the board's center coordinates in mm.
 *   - describe(): human-readable summary of the board for logs.
 * END */

import { Component, normalizeDeg, PieceState } from "../component/component.js";
import { Polygon } from "../geometry/polygon.js";
import { carriedStack, resolveZ, restingZ } from "./stacking.js";

export interface PlacedPiece extends PieceState {
  id: number;
  component: Component;
  zIndex: number;
  outlineMm: Polygon; // cached component.outlineMm(), for stacking overlap checks
  thicknessMm: number; // cached component.thicknessMm, for stack heights
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

  place(component: Component, xMm: number, yMm: number): PlacedPiece {
    component.assertValid();
    if (xMm < 0 || yMm < 0 || xMm > this.widthMm || yMm > this.heightMm) {
      throw new Error(`(${xMm}, ${yMm})mm is outside the ${this.widthMm}x${this.heightMm}mm board`);
    }
    const piece: PlacedPiece = {
      id: this.nextId++,
      component,
      xMm,
      yMm,
      zIndex: 0,
      rotationDeg: 0,
      faceUp: true,
      outlineMm: component.outlineMm(),
      thicknessMm: component.thicknessMm,
    };
    piece.zIndex = restingZ(piece, this.pieces);
    this.pieces.push(piece);
    return piece;
  }

  piece(id: number): PlacedPiece | undefined {
    return this.pieces.find((p) => p.id === id);
  }

  // Move the piece and everything stacked on top of it by the same delta
  // (the piece itself clamped to the board), then re-resolve z-indexes.
  movePiece(id: number, xMm: number, yMm: number): PlacedPiece {
    const piece = this.requirePiece(id);
    const stack = carriedStack(this.pieces, piece);
    const dx = Math.min(this.widthMm, Math.max(0, xMm)) - piece.xMm;
    const dy = Math.min(this.heightMm, Math.max(0, yMm)) - piece.yMm;
    for (const member of stack) {
      member.xMm += dx;
      member.yMm += dy;
    }
    resolveZ(this.pieces, stack);
    return piece;
  }

  rotatePiece(id: number, rotationDeg: number): PlacedPiece {
    const piece = this.requirePiece(id);
    piece.rotationDeg = normalizeDeg(rotationDeg);
    return piece;
  }

  private requirePiece(id: number): PlacedPiece {
    const piece = this.piece(id);
    if (!piece) throw new Error(`no piece with id ${id}`);
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
      const xs = piece.outlineMm.map(([x]) => x);
      const ys = piece.outlineMm.map(([, y]) => y);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      lines.push(
        `  #${piece.id} ${piece.component.constructor.name} ` +
          `(${w}x${h}x${piece.thicknessMm}mm) ` +
          `at (${piece.xMm}, ${piece.yMm})mm, z=${piece.zIndex}`,
      );
    }
    return lines.join("\n");
  }
}
