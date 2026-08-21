/* START
 * The abstract Component base class shared by all game pieces (Card, GameObject).
 * - Component: subclasses must provide thicknessMm (vertical extent) and
 *   outlineMm(), the 2D footprint polygon in component-local mm coordinates
 *   (origin at the component center) used for stacking, hit testing, and
 *   side-face rendering. shapeMm() is the physical 3D shape as Prisms —
 *   default one prism filling outline x thickness (right for cards and
 *   solid objects); stacked pieces rest on the tallest prism under their
 *   footprint. assertValid() checks the outline is a valid polygon;
 *   subclasses extend it with their own invariants.
 *   Overridable interaction handlers: onDoubleClick (default: nothing;
 *   Card overrides it to flip) and onDoubleRightClick (default: rotate to
 *   the next 45° stop). Click + drag movement/rotation is core behavior,
 *   not defined here.
 * - Outline: a polygon as [x, y] points; edges wind so that edge p1 -> p2
 *   has outward normal (dy, -dx).
 * - Prism: { outlineMm, bottomMm, topMm }, a vertical extrusion of a
 *   polygon in component-local mm — the building block of shapeMm().
 * - rectangleOutline(w, h) / hexagonOutline(w, h): outline builders; the
 *   hexagon has vertices on the left/right and flat top/bottom edges.
 * - PieceState: the mutable on-board state handlers receive (position,
 *   rotation, which face is up).
 * - normalizeDeg(deg): normalize an angle into [0, 360).
 * END */

import { Polygon } from "../geometry/polygon.js";

// A component's 2D footprint: [x, y] mm points around the component center,
// wound so that edge p1 -> p2 has outward normal (dy, -dx).
export type Outline = Polygon;

// A vertical extrusion of a polygon: the building block of a component's
// physical shape. outlineMm is in component-local mm around the center;
// bottomMm/topMm are heights above the component's base.
export interface Prism {
  outlineMm: Outline;
  bottomMm: number;
  topMm: number;
}

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
  faceUp: boolean; // true when the front image is visible (cards only)
}

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export abstract class Component {
  // Vertical extent in mm, used for stack heights and side-face rendering.
  abstract readonly thicknessMm: number;

  // The component's 2D footprint in component-local mm coordinates (origin
  // at the center): stacking overlap, hit testing, and side faces.
  abstract outlineMm(): Outline;

  // The physical 3D shape as prisms within outline x thickness: stacked
  // pieces rest on the tallest prism under their footprint. Default: one
  // prism filling the footprint (right for cards and solid objects).
  shapeMm(): Prism[] {
    return [{ outlineMm: this.outlineMm(), bottomMm: 0, topMm: this.thicknessMm }];
  }

  // Double (left) click: nothing by default; Card overrides this to flip.
  onDoubleClick(piece: PieceState): void {
    void piece;
  }

  // Double right click: rotate 45°. If the piece sits between 45° stops
  // (after a free rotation), align with the nearest stop instead.
  onDoubleRightClick(piece: PieceState): void {
    const nearest = Math.round(piece.rotationDeg / 45) * 45;
    const atStop = Math.abs(piece.rotationDeg - nearest) < 1e-9;
    piece.rotationDeg = normalizeDeg(atStop ? nearest + 45 : nearest);
  }

  assertValid(): void {
    const outline = this.outlineMm();
    if (outline.length < 3) {
      throw new Error(`${this.constructor.name} outline has ${outline.length} points, need >= 3`);
    }
  }
}
