/* START
 * The GameObject base class for 3D game pieces (cubes, tokens, meeples).
 * Named GameObject rather than Object to avoid shadowing JavaScript's
 * global Object.
 * - GameObject extends Component (src/component/): a bounding box of
 *   lengthMm (x) x widthMm (y) x heightMm (vertical), defaulting to an 8mm
 *   cube, set via the constructor spec or subclass field overrides. The
 *   box's footprint (outlineMm) drives stacking and inputs; thicknessMm is
 *   the box height.
 * - shapeMm() (inherited from Component; default: one prism filling the
 *   box, a solid cuboid): the physical and rendered 3D shape as Prisms.
 *   Override for other shapes (tiers, hex tokens, ...) — pieces stack on
 *   the actual prisms, not the bounding box.
 * - color: the surface Color of the rendered shape (no textures).
 * - assertValid() checks: positive dimensions, the outline and every prism
 *   inside the bounding box, and prism z-ranges within [0, heightMm].
 * - Prism: re-exported from src/component/ for object subclasses.
 * - GameObjectSpec: the optional constructor spec (dimensions + color).
 * END */

import { Component, Outline, rectangleOutline } from "../component/component.js";
import { Color } from "../image/image.js";

export type { Prism } from "../component/component.js";

export interface GameObjectSpec {
  lengthMm?: number; // x extent of the bounding box
  widthMm?: number; // y extent
  heightMm?: number; // vertical extent
  color?: Color;
}

const DEFAULT_SIZE_MM = 8;
const DEFAULT_COLOR: Color = { r: 190, g: 190, b: 190, a: 255 };

export class GameObject extends Component {
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly color: Color;

  constructor(spec: GameObjectSpec = {}) {
    super();
    this.lengthMm = spec.lengthMm ?? DEFAULT_SIZE_MM;
    this.widthMm = spec.widthMm ?? DEFAULT_SIZE_MM;
    this.heightMm = spec.heightMm ?? DEFAULT_SIZE_MM;
    this.color = spec.color ?? DEFAULT_COLOR;
  }

  get thicknessMm(): number {
    return this.heightMm;
  }

  // The bounding box's footprint, used for stacking order and inputs.
  outlineMm(): Outline {
    return rectangleOutline(this.lengthMm, this.widthMm);
  }

  override assertValid(): void {
    super.assertValid();
    if (this.lengthMm <= 0 || this.widthMm <= 0 || this.heightMm <= 0) {
      throw new Error(
        `${this.constructor.name} dimensions must be positive, got ` +
          `${this.lengthMm}x${this.widthMm}x${this.heightMm}mm`,
      );
    }
    this.assertInsideBox("outline", this.outlineMm());
    for (const prism of this.shapeMm()) {
      if (prism.outlineMm.length < 3) {
        throw new Error(
          `${this.constructor.name} prism outline has ${prism.outlineMm.length} points, need >= 3`,
        );
      }
      this.assertInsideBox("prism outline", prism.outlineMm);
      if (prism.bottomMm < 0 || prism.topMm > this.heightMm || prism.bottomMm >= prism.topMm) {
        throw new Error(
          `${this.constructor.name} prism spans ${prism.bottomMm}..${prism.topMm}mm, ` +
            `must be ascending within 0..${this.heightMm}mm`,
        );
      }
    }
  }

  private assertInsideBox(what: string, outline: Outline): void {
    for (const [x, y] of outline) {
      if (Math.abs(x) > this.lengthMm / 2 || Math.abs(y) > this.widthMm / 2) {
        throw new Error(
          `${this.constructor.name} ${what} point (${x}, ${y})mm is outside ` +
            `the ${this.lengthMm}x${this.widthMm}mm bounding box`,
        );
      }
    }
  }
}
