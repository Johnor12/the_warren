/* START
 * Unit tests for the pure camera model (camera.ts): projection round-trips
 * and the invariants of each mutation (pan shifts projections by the drag
 * delta, zoomAbout scales about the cursor with clamping, rotateAbout
 * pivots the view around the given screen point).
 * END */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Camera,
  fitCamera,
  MAX_SCALE,
  MIN_SCALE,
  pan,
  project,
  rotateAbout,
  unproject,
  zoomAbout,
} from "./camera.js";

const CAM: Camera = { s: 2, yaw: 0.3, offsetX: 100, offsetY: 80 };
const POINTS: [number, number][] = [
  [0, 0],
  [50, 20],
  [-30, 75],
];

function assertClose(actual: [number, number], expected: [number, number]): void {
  for (const i of [0, 1] as const) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) < 1e-9,
      `[${actual}] != [${expected}]`,
    );
  }
}

test("unproject inverts project on the z=0 plane", () => {
  for (const [x, y] of POINTS) {
    assertClose(unproject(CAM, ...project(CAM, x, y, 0)), [x, y]);
  }
});

test("fitCamera centers the board in the viewport", () => {
  const board = { widthMm: 900, heightMm: 600, pieces: [] };
  const cam = fitCamera(board, 1280, 720);
  assertClose(project(cam, 450, 300, 0), [640, 360]);
});

test("pan shifts every projection by the screen delta", () => {
  const panned = pan(CAM, 25, -10);
  for (const [x, y] of POINTS) {
    const [px, py] = project(CAM, x, y, 5);
    assertClose(project(panned, x, y, 5), [px + 25, py - 10]);
  }
});

test("zoomAbout scales while fixing the world point under the cursor", () => {
  const zoomed = zoomAbout(CAM, 200, 150, 1.5);
  assert.equal(zoomed.s, CAM.s * 1.5);
  assertClose(project(zoomed, ...unproject(CAM, 200, 150), 0), [200, 150]);
});

test("zoomAbout clamps the scale", () => {
  assert.equal(zoomAbout(CAM, 0, 0, 1e9).s, MAX_SCALE);
  assert.equal(zoomAbout(CAM, 0, 0, 1e-9).s, MIN_SCALE);
});

test("rotateAbout changes yaw while fixing the pivot's world point", () => {
  const rotated = rotateAbout(CAM, 320, 240, 1.2);
  assert.equal(rotated.yaw, CAM.yaw + 1.2);
  assertClose(project(rotated, ...unproject(CAM, 320, 240), 0), [320, 240]);
});

test("rotateAbout 90 degrees maps +x onto where +y projected", () => {
  const cam: Camera = { s: 1, yaw: 0, offsetX: 0, offsetY: 0 };
  const rotated = rotateAbout(cam, ...project(cam, 0, 0, 0), Math.PI / 2);
  assertClose(project(rotated, 10, 0, 0), project(cam, 0, 10, 0));
});

test("rotateAbout a full turn restores every projection", () => {
  const rotated = rotateAbout(CAM, 320, 240, 2 * Math.PI);
  for (const [x, y] of POINTS) {
    assertClose(project(rotated, x, y, 5), project(CAM, x, y, 5));
  }
});
