/* START
 * Server-side serialization of a Board for the browser renderer.
 * - boardToDto(board): Board -> BoardDto, with face image URLs of the form
 *   /pieces/<id>/<face>.png.
 * - pieceUpdatesToDto(board): every piece's mutable state + id + z-index
 *   (the response body of piece interaction POSTs).
 * - pieceFaceImage(board, id, face): the Image behind a face URL, or
 *   undefined for unknown ids.
 * END */

import { Board, PlacedPiece } from "../board/board.js";
import { CARD_THICKNESS_MM } from "../card/card.js";
import { Image } from "../image/image.js";
import { BoardDto, PieceUpdateDto } from "./types.js";

export function boardToDto(board: Board): BoardDto {
  return {
    widthMm: board.widthMm,
    heightMm: board.heightMm,
    pieces: board.pieces.map((piece) => ({
      ...pieceUpdateToDto(piece),
      widthMm: piece.card.widthMm,
      heightMm: piece.card.heightMm,
      outlineMm: piece.outlineMm,
      thicknessMm: CARD_THICKNESS_MM,
      frontUrl: `/pieces/${piece.id}/front.png`,
      backUrl: `/pieces/${piece.id}/back.png`,
    })),
  };
}

export function pieceUpdatesToDto(board: Board): PieceUpdateDto[] {
  return board.pieces.map(pieceUpdateToDto);
}

function pieceUpdateToDto(piece: PlacedPiece): PieceUpdateDto {
  return {
    id: piece.id,
    xMm: piece.xMm,
    yMm: piece.yMm,
    rotationDeg: piece.rotationDeg,
    faceUp: piece.faceUp,
    zIndex: piece.zIndex,
  };
}

export function pieceFaceImage(board: Board, id: number, face: "front" | "back"): Image | undefined {
  return board.piece(id)?.card[face];
}
