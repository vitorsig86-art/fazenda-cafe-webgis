const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");
const root = path.join(__dirname, "..");
function load(file, dependencies = {}, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8").replaceAll("import.meta.env", "testEnvironment"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? require(name), testEnvironment: env, console });
  return exports;
}
async function main() {
  const clipping = load("src/cesium/modelClipping.ts");
  const config = { inverse: true, positions: [[-45.316, -21.349], [-45.313, -21.349], [-45.313, -21.346], [-45.316, -21.346]] };
  const collection = clipping.createModelClipping(config);
  assert.ok(collection instanceof cesium.ClippingPolygonCollection);
  assert.ok(collection.get(0) instanceof cesium.ClippingPolygon);
  assert.equal(collection.inverse, true);
  assert.equal(collection.enabled, true);
  collection.get(0).positions.forEach((p, i) => {
    const degrees = clipping.geographicVertex(p);
    assert.ok(Math.abs(degrees[0] - config.positions[i][0]) < 1e-10);
    assert.ok(Math.abs(degrees[1] - config.positions[i][1]) < 1e-10);
  });
  const terrain = { clippingPolygons: undefined };
  const tileset = {};
  clipping.applyModelClipping(tileset, config);
  assert.equal(tileset.clippingPolygons.inverse, true);
  assert.equal(terrain.clippingPolygons, undefined);
  tileset.clippingPolygons.enabled = false;
  assert.equal(tileset.clippingPolygons.enabled, false);
  tileset.clippingPolygons.removeAll();
  assert.equal(tileset.clippingPolygons.length, 0);
  assert.throws(() => clipping.createModelClipping({ inverse: true, positions: config.positions.slice(0, 2) }));
  assert.throws(() => clipping.createModelClipping({ inverse: true, positions: [[0, 0], [1, 1], [2, 2]] }));
  assert.throws(() => clipping.createModelClipping({ inverse: true, positions: [[0, 0], [1, 1], [0, 1], [1, 0]] }));
  assert.throws(() => clipping.createModelClipping({ inverse: true, positions: [[Infinity, 0], [1, 1], [0, 1]] }));
  const exported = clipping.exportModelClipping(config);
  const restored = vm.runInNewContext(`(${exported})`);
  assert.equal(restored.inverse, true);
  assert.equal(JSON.stringify(restored.positions), JSON.stringify(config.positions));
  assert.match(exported, /-45\.3160000, -21\.3490000/);

  // Exercise both loader transports without credentials/network; the real native
  // polygon collection is attached after each mocked tileset initialization.
  const results = [];
  const mockCesium = { ...cesium, Cesium3DTileset: { fromUrl: async () => { const value = { destroy() {} }; results.push(value); return value; } },
    IonResource: { fromAssetId: async (id, options) => { assert.equal(id, 17); assert.equal(options.accessToken, "synthetic"); return "synthetic-resource"; } } };
  const loader = load("src/cesium/loadLayer.ts", { cesium: mockCesium, "./modelClipping": clipping, "./modelHeight": load("src/cesium/modelHeight.ts"), "./vectorPopup": {} }, { TEST_TOKEN: "synthetic" });
  for (const source of [
    { format: "3d-tiles", source: "url", url: "https://example.invalid/model.json" },
    { format: "3d-tiles", source: "ion", assetId: 17, tokenEnv: "TEST_TOKEN" },
  ]) {
    const full = await loader.loadLayer({ source });
    assert.equal(full.clippingPolygons, undefined);
    const cropped = await loader.loadLayer({ source: { ...source, clipping: config } });
    assert.equal(cropped.clippingPolygons.inverse, true);
    assert.equal(cropped.clippingPolygons.length, 1);
  }
  console.log("Model clipping passed: native Cesium polygons, inverse flag, geographic round trip/export, validation, preview/clear, ion and URL loaders, no clipping by default.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
