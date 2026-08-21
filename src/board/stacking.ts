/* START
 * Pure stacking logic: which pieces rest on which, who moves together, and
 * z-index resolution. Works on a minimal piece shape (StackPiece) so both
 * the server's PlacedPiece and the browser's PieceDto satisfy it; browser
 * safe (no node imports).
 * - StackPiece: position, rotation, zIndex, the piece-local outline, and
 *   optionally the shape prisms (pieces rest on prisms, not bounding
 *   boxes; absent — cards — means one prism filling outline x thickness).
 * - footprint(piece): the piece's outline in world mm coordinates.
 * - piecesOverlap(a, b): whether two pieces' footprints share area (a
 *   shared edge alone doesn't count).
 * - carriedStack(pieces, base): base plus everything physically resting on
 *   it (transitively), ascending z — the set that moves when base moves.
 * - restingZ(piece, others): the z a piece takes among others: on top of
 *   the highest overlapped piece, or 0 on the bare board.
 * - resolveZ(pieces, moved): reassign every z-index bottom-up after a move;
 *   settled pieces keep their relative order, the moved stack arrives last
 *   so it lands on top of whatever it now overlaps.
 * - stackBottoms(pieces): each piece's physical bottom height in mm — the
 *   tallest shape surface under its footprint (a card on an 8mm cube sits
 *   at 8mm; on a tiered object's low tier, at that tier's top), for
 *   rendering and hit testing.
 * - landingBottoms(settled, moving): where each member of a moving stack
 *   would land if dropped right now — the drag preview, matching the
 *   post-drop resolveZ + stackBottoms result exactly.
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
  // The physical shape as vertical extrusions (see component.ts Prism):
  // pieces rest on the tallest prism under their footprint. Absent (cards):
  // one prism filling outline x thickness.
  prisms?: { outlineMm: Polygon; topMm: number }[];
}

// The piece's outline in world coordinates (rotated about its center,
// translated to its position).
export function footprint(piece: StackPiece): Polygon {
  return worldOutline(piece, piece.outlineMm);
}

// A piece-local outline placed into world coordinates.
function worldOutline(piece: StackPiece, outline: Polygon): Polygon {
  const rad = (piece.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return outline.map(([x, y]) => [
    piece.xMm + x * cos - y * sin,
    piece.yMm + x * sin + y * cos,
  ]);
}

// The top of support's surface under piece's footprint, relative to
// support's bottom: the tallest shape prism the footprint overlaps. null
// when no prism is under the piece (footprints apart, or only empty
// bounding box crossed), so support holds nothing up there.
function surfaceTopMm(support: StackPiece, piece: StackPiece): number | null {
  const foot = footprint(piece);
  const prisms = support.prisms ?? [
    { outlineMm: support.outlineMm, topMm: support.thicknessMm },
  ];
  let top: number | null = null;
  for (const prism of prisms) {
    if (polygonsOverlap(worldOutline(support, prism.outlineMm), foot)) {
      top = Math.max(top ?? 0, prism.topMm);
    }
  }
  return top;
}

export function piecesOverlap(a: StackPiece, b: StackPiece): boolean {
  return polygonsOverlap(footprint(a), footprint(b));
}

// Equal stack heights can be reached by different thickness sums, so height
// comparisons tolerate float drift.
const HEIGHT_EPS_MM = 1e-6;

// base plus every piece physically resting on it, transitively, in ascending
// z order: a piece is carried when its bottom sits on a member's surface
// under it. Footprint overlap from a higher z alone is not enough — a card
// overhanging its cube may hang above a ground card that belongs to a
// different stack.
export function carriedStack<T extends StackPiece>(pieces: T[], base: T): T[] {
  const bottoms = stackBottoms(pieces);
  const restsOn = (piece: T, support: T) => {
    if (piece.zIndex <= support.zIndex) return false;
    const surface = surfaceTopMm(support, piece);
    return (
      surface !== null &&
      Math.abs(bottoms.get(piece)! - (bottoms.get(support)! + surface)) < HEIGHT_EPS_MM
    );
  };
  const stack = [base];
  const above = pieces
    .filter((p) => p !== base && p.zIndex > base.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex);
  for (const piece of above) {
    if (stack.some((member) => restsOn(piece, member))) stack.push(piece);
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

// Each piece's physical bottom height: resting on the tallest shape surface
// among the pieces below it (by z-index), or 0 on the board. z-indexes stay
// the stacking model; heights only matter for rendering and hit testing.
export function stackBottoms<T extends StackPiece>(pieces: T[]): Map<T, number> {
  const sorted = [...pieces].sort((a, b) => a.zIndex - b.zIndex);
  const bottoms = new Map<T, number>();
  for (const piece of sorted) {
    let bottom = 0;
    for (const other of sorted) {
      if (other.zIndex >= piece.zIndex) break;
      const surface = surfaceTopMm(other, piece);
      if (surface !== null) {
        bottom = Math.max(bottom, bottoms.get(other)! + surface);
      }
    }
    bottoms.set(piece, bottom);
  }
  return bottoms;
}

// Where each member of a moving stack would land if dropped right now:
// members settle bottom-up (stack order), each resting on the tallest
// surface under it — a settled piece or an already-landed member. Matches
// what resolveZ + stackBottoms produce after a real drop, so a drag
// preview rendered at these heights is exactly the drop result: a carried
// piece passing over a taller settled piece is shown landing on it while
// the stack itself stays whole for the rest of the drag.
export function landingBottoms<T extends StackPiece>(
  settled: T[],
  moving: T[],
): Map<T, number> {
  const bottoms = stackBottoms(settled);
  const supports = [...settled];
  const landing = new Map<T, number>();
  for (const piece of [...moving].sort((a, b) => a.zIndex - b.zIndex)) {
    let bottom = 0;
    for (const support of supports) {
      const surface = surfaceTopMm(support, piece);
      if (surface !== null) {
        bottom = Math.max(bottom, bottoms.get(support)! + surface);
      }
    }
    bottoms.set(piece, bottom);
    landing.set(piece, bottom);
    supports.push(piece);
  }
  return landing;
}
