/* START
 * Conversion between physical dimensions (mm) and pixels.
 * - PX_PER_MM: the fixed rendering resolution of the system.
 * - mmToPx(mm): millimeters -> whole pixels.
 * - pxToMm(px): pixels -> millimeters.
 * END */

export const PX_PER_MM = 10;

export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM);
}

export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}
