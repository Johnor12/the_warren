/* START
 * Server-side serialization of a Board for the browser renderer.
 * - boardToDto(board): Board -> BoardDto, with face image URLs of the form
 *   /pieces/<id>/<face>.png.
 * - pieceStateToDto(piece): the mutable piece state alone (the response body
 *   of piece interaction POSTs).
 * - pieceFaceImage(board, id, face): the Image behind a face URL, or
 *   undefined for unknown ids.
 * END */

import { Board, PlacedPiece } from "../board/board.js";
import { CARD_THICKNESS_MM } from "../card/card.js";
import { Image } from "../image/image.js";
import { BoardDto, PieceStateDto } from "./types.js";

export function boardToDto(board: Board): BoardDto {
  return {
    widthMm: board.widthMm,
    heightMm: board.heightMm,
    pieces: board.pieces.map((piece) => ({
      ...pieceStateToDto(piece),
      id: piece.id,
      widthMm: piece.card.widthMm,
      heightMm: piece.card.heightMm,
      outlineMm: piece.card.outlineMm(),
      thicknessMm: CARD_THICKNESS_MM,
      zIndex: piece.zIndex,
      frontUrl: `/pieces/${piece.id}/front.png`,
      backUrl: `/pieces/${piece.id}/back.png`,
    })),
  };
}

export function pieceStateToDto(piece: PlacedPiece): PieceStateDto {
  return {
    xMm: piece.xMm,
    yMm: piece.yMm,
    rotationDeg: piece.rotationDeg,
    faceUp: piece.faceUp,
  };
}

export function pieceFaceImage(board: Board, id: number, face: "front" | "back"): Image | undefined {
  return board.piece(id)?.card[face];
}
