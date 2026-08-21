/* START
 * Server-side serialization of a Board for the browser renderer.
 * - boardToDto(board): Board -> BoardDto; cards get face image URLs of the
 *   form /pieces/<id>/<face>.png, objects get their color and prisms.
 *   Throws on components that are neither Cards nor GameObjects.
 * - pieceUpdatesToDto(board): every piece's mutable state + id + z-index
 *   (the response body of piece interaction POSTs).
 * - pieceFaceImage(board, id, face): the Image behind a face URL, or
 *   undefined for unknown ids and non-card pieces.
 * END */

import { Board, PlacedPiece } from "../board/board.js";
import { Card } from "../card/card.js";
import { Image } from "../image/image.js";
import { GameObject } from "../object/object.js";
import { BoardDto, PieceDto, PieceUpdateDto } from "./types.js";

export function boardToDto(board: Board): BoardDto {
  return {
    widthMm: board.widthMm,
    heightMm: board.heightMm,
    pieces: board.pieces.map(pieceToDto),
  };
}

function pieceToDto(piece: PlacedPiece): PieceDto {
  const base = {
    ...pieceUpdateToDto(piece),
    outlineMm: piece.outlineMm,
    thicknessMm: piece.thicknessMm,
  };
  const component = piece.component;
  if (component instanceof Card) {
    return {
      ...base,
      kind: "card",
      widthMm: component.widthMm,
      heightMm: component.heightMm,
      frontUrl: `/pieces/${piece.id}/front.png`,
      backUrl: `/pieces/${piece.id}/back.png`,
    };
  }
  if (component instanceof GameObject) {
    const { r, g, b } = component.color;
    return { ...base, kind: "object", color: { r, g, b }, prisms: piece.prisms };
  }
  throw new Error(`${component.constructor.name} is neither a Card nor a GameObject`);
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
  const component = board.piece(id)?.component;
  return component instanceof Card ? component[face] : undefined;
}
