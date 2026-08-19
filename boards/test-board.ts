/* START
 * Test board definition: four cards spread on a 500x500mm board, covering
 * the "non-standard" card shapes.
 * - TestCard: standard 41x63mm card, white faces with "Front"/"Back" text.
 * - HexCard: hexagonal 95x83mm card (overrides outlineMm); its face bitmaps
 *   fill the hexagon (white hexagon on transparency), same text.
 * - BigCard: larger 63x88mm rectangular card, same text faces.
 * - ArtCard: standard 41x63mm card with front/back imported from PNG files
 *   in boards/assets/, scaled to the face dimensions.
 * - buildBoard(): builds and returns the completed board (used by the
 *   server to render it).
 * - Run directly (`npm run test-board`): prints the board summary and
 *   exports every piece's face images to out/ for inspection.
 * END */

import { fileURLToPath, pathToFileURL } from "node:url";
import { Board } from "../src/board/board.js";
import { Card, hexagonOutline, Outline } from "../src/card/card.js";
import { polygonImage, scaledImage, textImage } from "../src/image/create.js";
import { Color, Image } from "../src/image/image.js";
import { loadPngAsImage, saveImageAsPng } from "../src/image/png.js";
import { mmToPx } from "../src/units/units.js";

const WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Color = { r: 0, g: 0, b: 0, a: 255 };

// A white card face filling the card's shape, with the label painted in the
// center.
function textFace(card: Card, label: string): Image {
  const face = polygonImage(mmToPx(card.widthMm), mmToPx(card.heightMm), card.outlinePx(), WHITE);
  const text = textImage(label, mmToPx(30), mmToPx(10), BLACK);
  face.paint(text, (face.width - text.width) / 2, (face.height - text.height) / 2);
  return face;
}

// A card face imported from a PNG in boards/assets/, scaled to fit.
function assetFace(name: string, widthMm: number, heightMm: number): Image {
  const path = fileURLToPath(new URL(`assets/${name}`, import.meta.url));
  return scaledImage(loadPngAsImage(path), mmToPx(widthMm), mmToPx(heightMm));
}

// The base text-faced card: subclasses only choose dimensions (and shape).
abstract class TextCard extends Card {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly front: Image;
  readonly back: Image;

  constructor(widthMm: number, heightMm: number) {
    super();
    this.widthMm = widthMm;
    this.heightMm = heightMm;
    // outlineMm() overrides are in effect here, so shaped subclasses get
    // faces filling their shape.
    this.front = textFace(this, "Front");
    this.back = textFace(this, "Back");
  }
}

class TestCard extends TextCard {
  constructor() {
    super(41, 63);
  }
}

class HexCard extends TextCard {
  constructor() {
    super(95, 83);
  }

  override outlineMm(): Outline {
    return hexagonOutline(this.widthMm, this.heightMm);
  }
}

class BigCard extends TextCard {
  constructor() {
    super(63, 88);
  }
}

class ArtCard extends Card {
  readonly widthMm = 41;
  readonly heightMm = 63;
  readonly front = assetFace("dice.png", this.widthMm, this.heightMm);
  readonly back = assetFace("example.png", this.widthMm, this.heightMm);
}

export function buildBoard(): Board {
  const board = new Board(500, 500);
  board.place(new TestCard(), 125, 125);
  board.place(new HexCard(), 365, 125);
  board.place(new BigCard(), 125, 365);
  board.place(new ArtCard(), 365, 365);
  return board;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const board = buildBoard();
  console.log(board.describe());

  for (const piece of board.pieces) {
    const name = piece.card.constructor.name.toLowerCase();
    saveImageAsPng(piece.card.front, `out/${name}-front.png`);
    saveImageAsPng(piece.card.back, `out/${name}-back.png`);
  }
  console.log("Face images written to out/<card>-front.png and out/<card>-back.png");
}
