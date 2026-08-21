/* START
 * Pure 2D polygon math, shared by card validation, image rasterization,
 * renderer hit testing, and stacking overlap checks.
 * - Polygon: a polygon as [x, y] points (any unit, any origin).
 * - pointInPolygon(x, y, polygon): ray-casting inside test.
 * - rowSpans(polygon, y): the x-intervals covered by the polygon along the
 *   horizontal line at y, as sorted [start, end] pairs — the scanline
 *   primitive behind polygon fills, masks, and shape validation.
 * - polygonsOverlap(a, b): whether two polygons' interiors overlap; shared
 *   edges/vertices alone (adjacent tiles) do not count.
 * - convexHull(points): the convex hull of a point set, counterclockwise.
 * END */

export type Polygon = [number, number][];

// Ray casting: count edges crossed by a ray going in +x from (x, y).
export function pointInPolygon(x: number, y: number, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function rowSpans(polygon: Polygon, y: number): [number, number][] {
  const crossings: number[] = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y) {
      crossings.push(xi + ((xj - xi) * (y - yi)) / (yj - yi));
    }
  }
  crossings.sort((a, b) => a - b);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    spans.push([crossings[i], crossings[i + 1]]);
  }
  return spans;
}

// Interior overlap: true when the polygons share area, not merely a
// boundary — pieces laid exactly edge to edge (adjacent tiles) don't
// overlap. Tested three ways: a vertex of one inside the other (vertices
// nudged toward the centroid so exact-boundary contact doesn't count),
// a centroid inside the other (catches coincident polygons), or a strict
// edge crossing (catches overlaps that contain no vertex or centroid).
const SHRINK = 1e-6;

export function polygonsOverlap(a: Polygon, b: Polygon): boolean {
  return interiorPointInside(a, b) || interiorPointInside(b, a) || edgesCross(a, b);
}

function interiorPointInside(a: Polygon, b: Polygon): boolean {
  const [cx, cy] = centroid(a);
  if (pointInPolygon(cx, cy, b)) return true;
  return a.some(([x, y]) =>
    pointInPolygon(x + (cx - x) * SHRINK, y + (cy - y) * SHRINK, b),
  );
}

function centroid(polygon: Polygon): [number, number] {
  let x = 0;
  let y = 0;
  for (const [px, py] of polygon) {
    x += px;
    y += py;
  }
  return [x / polygon.length, y / polygon.length];
}

function edgesCross(a: Polygon, b: Polygon): boolean {
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      // Strict crossing: each segment's endpoints on opposite sides of the
      // other segment's line. Touching or collinear contact is not a cross.
      if (
        side(a1, a2, b1) * side(a1, a2, b2) < 0 &&
        side(b1, b2, a1) * side(b1, b2, a2) < 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function side(p: [number, number], q: [number, number], r: [number, number]): number {
  return Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
}

// Andrew's monotone chain: the convex hull of a point set, counterclockwise
// with collinear points dropped. Points on the hull are shared, not copied.
export function convexHull(points: Polygon): Polygon {
  const sorted = [...points].sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
  if (sorted.length < 3) return sorted;
  const chain = (input: Polygon): Polygon => {
    const out: Polygon = [];
    for (const p of input) {
      while (out.length >= 2 && side(out[out.length - 2], out[out.length - 1], p) <= 0) {
        out.pop();
      }
      out.push(p);
    }
    out.pop(); // the chain's last point starts the other chain
    return out;
  };
  return [...chain(sorted), ...chain([...sorted].reverse())];
}
