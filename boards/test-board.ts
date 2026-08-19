/* START
 * Test board definition: a single 41x63mm TestCard placed at the center of a
 * 500x500mm board.
 * - TestCard: white faces with "Front" / "Back" text painted on them.
 * - buildBoard(): builds and returns the completed board (used by the
 *   server to render it).
 * - Run directly (`npm run test-board`): prints the board summary and
 *   exports the card's face images to out/ for inspection.
 * END */

import { pathToFileURL } from "node:url";
import { Board } from "../src/board/board.js";
import { Card } from "../src/card/card.js";
import { solidImage, textImage } from "../src/image/create.js";
import { Color, Image } from "../src/image/image.js";
import { saveImageAsPng } from "../src/image/png.js";
import { mmToPx } from "../src/units/units.js";

const WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Color = { r: 0, g: 0, b: 0, a: 255 };

class TestCard extends Card {
  readonly widthMm = 41;
  readonly heightMm = 63;
  readonly front: Image;
  readonly back: Image;

  constructor() {
    super();
    this.front = this.makeFace("Front");
    this.back = this.makeFace("Back");
  }

  // A white card face with the label painted in the center.
  private makeFace(label: string): Image {
    const face = solidImage(mmToPx(this.widthMm), mmToPx(this.heightMm), WHITE);
    const text = textImage(label, mmToPx(30), mmToPx(10), BLACK);
    face.paint(text, (face.width - text.width) / 2, (face.height - text.height) / 2);
    return face;
  }
}

export function buildBoard(): Board {
  const board = new Board(500, 500);
  board.place(new TestCard(), board.centerX(), board.centerY());
  return board;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const board = buildBoard();
  console.log(board.describe());

  const card = board.pieces[0].card;
  saveImageAsPng(card.front, "out/test-card-front.png");
  saveImageAsPng(card.back, "out/test-card-back.png");
  console.log("Face images written to out/test-card-front.png and out/test-card-back.png");
}
