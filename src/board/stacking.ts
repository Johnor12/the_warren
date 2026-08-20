/* START
 * Pure stacking logic: which pieces rest on which, who moves together, and
 * z-index resolution. Works on a minimal piece shape (StackPiece) so both
 * the server's PlacedPiece and the browser's PieceDto satisfy it; browser
 * safe (no node imports).
 * - StackPiece: position, rotation, zIndex, and the card-local outline.
 * - footprint(piece): the piece's outline in world mm coordinates.
 * - piecesOverlap(a, b): whether two pieces' footprints share area (a
 *   shared edge alone doesn't count).
 * - carriedStack(pieces, base): base plus everything stacked on top of it
 *   (transitively), ascending z — the set that moves when base moves.
 * - restingZ(piece, others): the z a piece takes among others: on top of
 *   the highest overlapped piece, or 0 on the bare board.
 * - resolveZ(pieces, moved): reassign every z-index bottom-up after a move;
 *   settled pieces keep their relative order, the moved stack arrives last
 *   so it lands on top of whatever it now overlaps.
 * - stackBottoms(pieces): each piece's physical bottom height in mm (piece
 *   thicknesses vary — a card resting on an 8mm cube sits at 8mm), for
 *   rendering and hit testing.
 * END */

import { Polygon, polygonsOverlap } from "../geometry/polygon.js";

// The subset of a placed piece that stacking reads and mutates. Both the
// server's PlacedPiece and the client's PieceDto satisfy it structurally.
export interface StackPiece {
  xMm: number;
  yMm: number;
  rotationDeg: number;
  zIndex: number;
  outlineMm: Polygon;
  thicknessMm: number;
}

// The piece's outline in world coordinates (rotated about its center,
// translated to its position).
export function footprint(piece: StackPiece): Polygon {
  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return piece.outlineMm.map(([x, y]) => [
    piece.xMm + x * cos - y * sin,
    piece.yMm + x * sin + y * cos,
  ]);
}

export function piecesOverlap(a: StackPiece, b: StackPiece): boolean {
  return polygonsOverlap(footprint(a), footprint(b));
}

// base plus every piece stacked on top of it — any piece overlapping a
// member of the stack from a higher z, transitively — in ascending z order.
export function carriedStack<T extends StackPiece>(pieces: T[], base: T): T[] {
  const stack = [base];
  const above = pieces
    .filter((p) => p !== base && p.zIndex > base.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex);
  for (const piece of above) {
    if (stack.some((m) => m.zIndex < piece.zIndex && piecesOverlap(piece, m))) {
      stack.push(piece);
    }
  }
  return stack;
}

// The z-index a piece takes when it arrives among others: on top of the
// highest piece it overlaps, or 0 on the bare board.
export function restingZ(piece: StackPiece, others: StackPiece[]): number {
  const below = others.filter((other) => piecesOverlap(piece, other));
  return below.length === 0 ? 0 : Math.max(...below.map((o) => o.zIndex)) + 1;
}

// Reassign every z-index from the bottom up. Settled pieces are processed
// in their current z order (preserving arrival order within stacks); the
// just-moved stack counts as the newest arrival, so it lands on top of
// whatever it now overlaps. Also re-bases stacks pulled onto empty board.
export function resolveZ(pieces: StackPiece[], moved: StackPiece[]): void {
  const movedSet = new Set(moved);
  const settled = pieces
    .filter((p) => !movedSet.has(p))
    .sort((a, b) => a.zIndex - b.zIndex);
  const placed: StackPiece[] = [];
  for (const piece of [...settled, ...moved]) {
    piece.zIndex = restingZ(piece, placed);
    placed.push(piece);
  }
}

// Each piece's physical bottom height: resting on the tallest top among the
// overlapped pieces below it (by z-index), or 0 on the board. z-indexes stay
// the stacking model; heights only matter for rendering and hit testing.
export function stackBottoms<T extends StackPiece>(pieces: T[]): Map<T, number> {
  const sorted = [...pieces].sort((a, b) => a.zIndex - b.zIndex);
  const bottoms = new Map<T, number>();
  for (const piece of sorted) {
    let bottom = 0;
    for (const other of sorted) {
      if (other.zIndex >= piece.zIndex) break;
      if (piecesOverlap(piece, other)) {
        bottom = Math.max(bottom, bottoms.get(other)! + other.thicknessMm);
      }
    }
    bottoms.set(piece, bottom);
  }
  return bottoms;
}
