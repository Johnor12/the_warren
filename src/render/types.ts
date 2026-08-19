/* START
 * Shared data types describing a board to the browser renderer.
 * - PieceDto: one placed piece: mm dimensions, center position, thickness,
 *   z-index, and the URLs of its face images.
 * - BoardDto: board mm dimensions plus all pieces; the JSON payload of
 *   GET /board.json.
 * END */

export interface PieceDto {
  id: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  xMm: number; // center of the piece
  yMm: number;
  zIndex: number;
  frontUrl: string;
  backUrl: string;
}

export interface BoardDto {
  widthMm: number;
  heightMm: number;
  pieces: PieceDto[];
}
