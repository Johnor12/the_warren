/* START
 * The isometric camera: a pure, DOM-free model of the view transform and
 * the mutations user input applies to it. Mutations return new Cameras.
 * - Camera: scale (px per mm), yaw (radians), screen offset of the world
 *   origin.
 * - fitCamera(board, viewW, viewH): initial camera framing the whole board.
 * - project(cam, x, y, z) / unproject(cam, sx, sy): world mm <-> screen px
 *   (unproject on the z=0 plane).
 * - pan(cam, dx, dy): slide the view by a screen-px delta.
 * - zoomAbout(cam, sx, sy, factor): scale by factor (clamped to MIN_SCALE
 *   ..MAX_SCALE), keeping the world point under screen (sx, sy) fixed.
 * - rotateAbout(cam, sx, sy, dYaw): change yaw, keeping the world point
 *   under screen (sx, sy) fixed.
 * END */

import { BoardDto } from "./types.js";

// Screen slope of the projected world axes; +z is screen-up.
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const MARGIN_PX = 40;

export const MIN_SCALE = 0.05; // px per mm
export const MAX_SCALE = 100;

export interface Camera {
  s: number; // screen px per world mm
  yaw: number; // world rotation around +z, radians
  offsetX: number; // screen position of the world origin
  offsetY: number;
}

export function fitCamera(board: BoardDto, viewW: number, viewH: number): Camera {
  const isoW = (board.widthMm + board.heightMm) * COS;
  const isoH = (board.widthMm + board.heightMm) * SIN;
  const s = Math.min((viewW - 2 * MARGIN_PX) / isoW, (viewH - 2 * MARGIN_PX) / isoH);
  return {
    s,
    yaw: 0,
    offsetX: (viewW - (board.widthMm - board.heightMm) * COS * s) / 2,
    offsetY: (viewH - isoH * s) / 2,
  };
}

export function project(cam: Camera, xMm: number, yMm: number, zMm: number): [number, number] {
  const rx = xMm * Math.cos(cam.yaw) - yMm * Math.sin(cam.yaw);
  const ry = xMm * Math.sin(cam.yaw) + yMm * Math.cos(cam.yaw);
  return [
    cam.offsetX + (rx - ry) * COS * cam.s,
    cam.offsetY + (rx + ry) * SIN * cam.s - zMm * cam.s,
  ];
}

// Inverse of project() on the z=0 plane: screen px -> world mm.
export function unproject(cam: Camera, sx: number, sy: number): [number, number] {
  const u = (sx - cam.offsetX) / (COS * cam.s);
  const v = (sy - cam.offsetY) / (SIN * cam.s);
  const rx = (u + v) / 2;
  const ry = (v - u) / 2;
  const cos = Math.cos(cam.yaw);
  const sin = Math.sin(cam.yaw);
  return [rx * cos + ry * sin, ry * cos - rx * sin];
}

export function pan(cam: Camera, dxPx: number, dyPx: number): Camera {
  return { ...cam, offsetX: cam.offsetX + dxPx, offsetY: cam.offsetY + dyPx };
}

export function zoomAbout(cam: Camera, sx: number, sy: number, factor: number): Camera {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.s * factor));
  const f = s / cam.s;
  return {
    ...cam,
    s,
    offsetX: sx - (sx - cam.offsetX) * f,
    offsetY: sy - (sy - cam.offsetY) * f,
  };
}

export function rotateAbout(cam: Camera, sx: number, sy: number, dYaw: number): Camera {
  const [wx, wy] = unproject(cam, sx, sy);
  const rotated = { ...cam, yaw: cam.yaw + dYaw };
  const [px, py] = project(rotated, wx, wy, 0);
  return { ...rotated, offsetX: rotated.offsetX + sx - px, offsetY: rotated.offsetY + sy - py };
}
