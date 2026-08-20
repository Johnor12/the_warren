/* START
 * Shared data types describing a board to the browser renderer.
 * - PieceStateDto: the mutable piece state (center position, rotation, which
 *   face is up).
 * - PieceUpdateDto: one piece's state plus id and z-index; piece interaction
 *   POSTs respond with a PieceUpdateDto[] covering every piece, because a
 *   move can restack (and so re-index) pieces beyond the moved one.
 * - PieceDto: one placed piece — a discriminated union on `kind`:
 *   CardDto (mm dimensions and face image URLs) or ObjectDto (surface color
 *   and the rendered prisms). Both carry the shared PieceBaseDto: state,
 *   id, footprint outline polygon, thickness, and z-index.
 * - PrismDto: one vertical extrusion of an object's shape (local outline,
 *   height range above the object's base).
 * - BoardDto: board mm dimensions plus all pieces; the JSON payload of
 *   GET /board.json.
 * END */

export interface PieceStateDto {
  xMm: number; // center of the piece
  yMm: number;
  rotationDeg: number; // rotation about the piece center, relative to the board
  faceUp: boolean; // true when the front image is visible (cards only)
}

// The response body of piece interaction POSTs: one entry per piece on the
// board (moves can restack pieces other than the moved one).
export interface PieceUpdateDto extends PieceStateDto {
  id: number;
  zIndex: number;
}

export interface PieceBaseDto extends PieceStateDto {
  id: number;
  outlineMm: [number, number][]; // piece-local footprint polygon (see component.ts Outline)
  thicknessMm: number;
  zIndex: number;
}

export interface CardDto extends PieceBaseDto {
  kind: "card";
  widthMm: number;
  heightMm: number;
  frontUrl: string;
  backUrl: string;
}

export interface PrismDto {
  outlineMm: [number, number][]; // object-local, around the object center
  bottomMm: number; // height range above the object's base
  topMm: number;
}

export interface ObjectDto extends PieceBaseDto {
  kind: "object";
  color: { r: number; g: number; b: number };
  prisms: PrismDto[];
}

export type PieceDto = CardDto | ObjectDto;

export interface BoardDto {
  widthMm: number;
  heightMm: number;
  pieces: PieceDto[];
}
