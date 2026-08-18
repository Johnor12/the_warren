/* START
 * Test board definition: a single 41x63mm TestCard placed at the center of a
 * 500x500mm board.
 * - TestCard: white faces with "Front" / "Back" text painted on them.
 * - main(): builds the board, prints its summary, and exports the card's
 *   face images to out/ for inspection.
 * END */

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

function main(): void {
  const board = new Board(500, 500);
  const card = new TestCard();
  board.place(card, board.centerX(), board.centerY());

  console.log(board.describe());

  saveImageAsPng(card.front, "out/test-card-front.png");
  saveImageAsPng(card.back, "out/test-card-back.png");
  console.log("Face images written to out/test-card-front.png and out/test-card-back.png");
}

main();
