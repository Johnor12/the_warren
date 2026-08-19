/* START
 * Shared data types describing a board to the browser renderer.
 * - PieceStateDto: the mutable piece state (center position, rotation, which
 *   face is up); also the response body of piece interaction POSTs.
 * - PieceDto: one placed piece: its state plus mm dimensions, thickness,
 *   z-index, and the URLs of its face images.
 * - BoardDto: board mm dimensions plus all pieces; the JSON payload of
 *   GET /board.json.
 * END */

export interface PieceStateDto {
  xMm: number; // center of the piece
  yMm: number;
  rotationDeg: number; // rotation about the piece center, relative to the board
  faceUp: boolean; // true when the front image is visible
}

export interface PieceDto extends PieceStateDto {
  id: number;
  widthMm: number;
  heightMm: number;
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
