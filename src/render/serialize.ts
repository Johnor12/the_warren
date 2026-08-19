/* START
 * Server-side serialization of a Board for the browser renderer.
 * - boardToDto(board): Board -> BoardDto, with face image URLs of the form
 *   /pieces/<id>/<face>.png.
 * - pieceFaceImage(board, id, face): the Image behind a face URL, or
 *   undefined for unknown ids.
 * END */

import { Board } from "../board/board.js";
import { CARD_THICKNESS_MM } from "../card/card.js";
import { Image } from "../image/image.js";
import { BoardDto } from "./types.js";

export function boardToDto(board: Board): BoardDto {
  return {
    widthMm: board.widthMm,
    heightMm: board.heightMm,
    pieces: board.pieces.map((piece) => ({
      id: piece.id,
      widthMm: piece.card.widthMm,
      heightMm: piece.card.heightMm,
      thicknessMm: CARD_THICKNESS_MM,
      xMm: piece.xMm,
      yMm: piece.yMm,
      zIndex: piece.zIndex,
      frontUrl: `/pieces/${piece.id}/front.png`,
      backUrl: `/pieces/${piece.id}/back.png`,
    })),
  };
}

export function pieceFaceImage(board: Board, id: number, face: "front" | "back"): Image | undefined {
  const piece = board.pieces.find((p) => p.id === id);
  return piece?.card[face];
}
