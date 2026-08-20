/* START
 * Shared data types describing a board to the browser renderer.
 * - PieceStateDto: the mutable piece state (center position, rotation, which
 *   face is up).
 * - PieceUpdateDto: one piece's state plus id and z-index; piece interaction
 *   POSTs respond with a PieceUpdateDto[] covering every piece, because a
 *   move can restack (and so re-index) pieces beyond the moved one.
 * - PieceDto: one placed piece: its state plus mm dimensions, outline
 *   polygon, thickness, z-index, and the URLs of its face images.
 * - BoardDto: board mm dimensions plus all pieces; the JSON payload of
 *   GET /board.json.
 * END */

export interface PieceStateDto {
  xMm: number; // center of the piece
  yMm: number;
  rotationDeg: number; // rotation about the piece center, relative to the board
  faceUp: boolean; // true when the front image is visible
}

// The response body of piece interaction POSTs: one entry per piece on the
// board (moves can restack pieces other than the moved one).
export interface PieceUpdateDto extends PieceStateDto {
  id: number;
  zIndex: number;
}

export interface PieceDto extends PieceStateDto {
  id: number;
  widthMm: number;
  heightMm: number;
  outlineMm: [number, number][]; // card-local shape polygon (see card.ts Outline)
  thicknessMm: number;
  zIndex: number;
  frontUrl: string;
  backUrl: string;
}

export interface BoardDto {
  widthMm: number;
  heightMm: number;
  pieces: PieceDto[];
}
