/* START
 * Test board definition: four cards spread on a 500x500mm board, covering
 * the "non-standard" card shapes, a 10-card deck in the center for
 * exercising stacking, and 3D objects (colored cubes, a two-tier tower,
 * and a card resting on a cube for mixed-height stacking).
 * - TestCard: standard 41x63mm card, white faces with "Front"/"Back" text.
 * - HexCard: hexagonal 95x83mm card (overrides outlineMm); its face bitmaps
 *   fill the hexagon (white hexagon on transparency), same text.
 * - BigCard: larger 63x88mm rectangular card, same text faces.
 * - ArtCard: standard 41x63mm card with front/back imported from PNG files
 *   in boards/assets/, scaled to the face dimensions.
 * - The deck: ten TestCards placed on the same center spot (z 0-9).
 * - Cubes: default 8mm GameObjects in several colors, one stacked on
 *   another; Tower: a 12x12x30mm GameObject with a two-prism shape.
 * - buildBoard(): builds and returns the completed board (used by the
 *   server to render it).
 * - Run directly (`npm run test-board`): prints the board summary and
 *   exports every card's face images to out/ for inspection.
 * END */

import { fileURLToPath, pathToFileURL } from "node:url";
import { Board } from "../src/board/board.js";
import { Card } from "../src/card/card.js";
import { hexagonOutline, Outline } from "../src/component/component.js";
import { polygonImage, scaledImage, textImage } from "../src/image/create.js";
import { Color, Image } from "../src/image/image.js";
import { loadPngAsImage, saveImageAsPng } from "../src/image/png.js";
import { GameObject, Prism } from "../src/object/object.js";
import { mmToPx } from "../src/units/units.js";

const WHITE: Color = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: Color = { r: 0, g: 0, b: 0, a: 255 };
const RED: Color = { r: 200, g: 60, b: 60, a: 255 };
const BLUE: Color = { r: 60, g: 90, b: 200, a: 255 };
const YELLOW: Color = { r: 230, g: 200, b: 60, a: 255 };
const GREEN: Color = { r: 70, g: 170, b: 90, a: 255 };

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

// A 12x12x30mm tower: a full-footprint base with a narrower upper tier.
class Tower extends GameObject {
  constructor() {
    super({ lengthMm: 12, widthMm: 12, heightMm: 30, color: RED });
  }

  override shapeMm(): Prism[] {
    const tier: Outline = [
      [-3, -3],
      [3, -3],
      [3, 3],
      [-3, 3],
    ];
    return [
      { outlineMm: this.outlineMm(), bottomMm: 0, topMm: 18 },
      { outlineMm: tier, bottomMm: 18, topMm: 30 },
    ];
  }
}

export function buildBoard(): Board {
  const board = new Board(500, 500);
  board.place(new TestCard(), 125, 125);
  board.place(new HexCard(), 365, 125);
  board.place(new BigCard(), 125, 365);
  board.place(new ArtCard(), 365, 365);
  // A 10-card deck: same spot, so they stack in arrival order (z 0-9).
  for (let i = 0; i < 10; i++) board.place(new TestCard(), 250, 250);
  // 8mm cubes: blue clear of the others, yellow stacked on the red one.
  board.place(new GameObject({ color: RED }), 250, 120);
  board.place(new GameObject({ color: YELLOW }), 250, 120);
  board.place(new GameObject({ color: BLUE }), 275, 120);
  // A custom-shape object and a card resting on a cube (mixed heights);
  // the cube peeks out from under the card's edge.
  board.place(new Tower(), 250, 380);
  board.place(new GameObject({ color: GREEN }), 412, 250);
  board.place(new TestCard(), 435, 250);
  return board;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const board = buildBoard();
  console.log(board.describe());

  for (const piece of board.pieces) {
    if (!(piece.component instanceof Card)) continue;
    const name = piece.component.constructor.name.toLowerCase();
    saveImageAsPng(piece.component.front, `out/${name}-front.png`);
    saveImageAsPng(piece.component.back, `out/${name}-back.png`);
  }
  console.log("Face images written to out/<card>-front.png and out/<card>-back.png");
}
