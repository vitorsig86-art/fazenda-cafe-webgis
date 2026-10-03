const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const exportsForTest = {};
const source = fs.readFileSync(path.join(__dirname, "../src/components/popupPosition.ts"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports: exportsForTest });
const { placePopup } = exportsForTest;

function check(point, size, map, controls) {
  const result = placePopup(point, size, map, controls);
  assert.ok(result.left >= map.left + 12 && result.left + size.width <= map.right - 12);
  assert.ok(result.top >= map.top + 12 && result.top + size.height <= map.bottom - 12);
  for (const rect of controls) {
    assert.ok(result.left + size.width <= rect.left - 12 || result.left >= rect.right + 12
      || result.top + size.height <= rect.top - 12 || result.top >= rect.bottom + 12, "Popup must clear controls");
  }
  assert.ok(point.x < result.left - 4 || point.x > result.left + size.width + 4
    || point.y < result.top - 4 || point.y > result.top + size.height + 4, "Keep popup off the pointer");
  return result;
}

const map = { left: 316, top: 76, right: 1440, bottom: 900 };
const controls = [
  { left: 1136, top: 100, right: 1356, bottom: 146 },
  { left: 1368, top: 100, right: 1416, bottom: 294 },
  { left: 320, top: 868, right: 580, bottom: 898 },
];
const size = { width: 230, height: 90 };
for (const point of [{ x: 700, y: 90 }, { x: 800, y: 450 }, { x: 1400, y: 120 }, { x: 1200, y: 170 }, { x: 700, y: 840 }]) check(point, size, map, controls);
assert.equal(check({ x: 800, y: 450 }, size, map, controls).top, 474, "Prefer 24px below the click");
assert.ok(check({ x: 700, y: 840 }, size, map, controls).top < 840, "Use another direction near bottom");
// Arbitrary popup sizes cover parcel names, contour fields and future metadata.
for (const width of [140, 230, 300]) for (const height of [70, 110, 200]) {
  for (let x = 330; x < 1440; x += 95) for (let y = 88; y < 900; y += 81) check({ x, y }, { width, height }, map, controls);
}
for (const height of [844, 568]) {
  const mobile = { left: 0, top: 46, right: 390, bottom: height };
  const mobileControls = [
    { left: 8, top: 54, right: 210, bottom: 100 },
    { left: 338, top: 54, right: 382, bottom: 242 },
    { left: 4, top: height - 36, right: 260, bottom: height - 2 },
  ];
  for (const point of [{ x: 100, y: 110 }, { x: 190, y: 320 }, { x: 380, y: 150 }, { x: 190, y: height - 16 }]) check(point, size, mobile, mobileControls);
}
console.log("Popup positioning passed: top/center/right/bottom clicks, below-click offset, viewport bounds, measurement/navigation/credit clearance, varied content sizes and mobile/short-mobile viewports.");
