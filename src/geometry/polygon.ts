/* START
 * Pure 2D polygon math, shared by card validation, image rasterization,
 * and renderer hit testing.
 * - Polygon: a polygon as [x, y] points (any unit, any origin).
 * - pointInPolygon(x, y, polygon): ray-casting inside test.
 * - rowSpans(polygon, y): the x-intervals covered by the polygon along the
 *   horizontal line at y, as sorted [start, end] pairs — the scanline
 *   primitive behind polygon fills, masks, and shape validation.
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
