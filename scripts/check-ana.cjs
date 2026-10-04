const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");
const root = path.join(__dirname, "..");
const modules = new Map();
let response;
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8").replaceAll("import.meta.env", "({})"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, structuredClone, console, require: name => name === "cesium"
    ? { ...cesium, Resource: { fetchJson: async () => response } }
    : name.startsWith(".") ? load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name + ".ts"))) : require(name) });
  return exports;
}
async function main() {
  const { fazendaCafeProject: project } = load("src/projects/fazendaCafe.ts");
  const { loadLayer, attachLayer, removeLayer, setVectorOpacity } = load("src/cesium/loadLayer.ts");
  const { readVectorPopup, registerVectorPopup, resolveVectorPopupSelection } = load("src/cesium/vectorPopup.ts");
  const basinConfig = project.layers.find(layer => layer.id === "microbacias-ana");
  const lineConfig = project.layers.find(layer => layer.id === "drenagem-ana");
  assert.equal(basinConfig.defaultVisible, false);
  assert.equal(lineConfig.defaultVisible, false);
  assert.equal(basinConfig.opacityControl, true);
  const ring = [[-45.32, -21.35], [-45.319, -21.35], [-45.319, -21.349], [-45.318, -21.349], [-45.318, -21.348], [-45.32, -21.35]];
  response = { type: "FeatureCollection", features: [83, 71, 82, 77].map(id => ({ type: "Feature", id: "duplicate",
    properties: { STREAM_ID: id, NEXT_STREAM_ID: 69, PERIMETER: "4.728 km", ENCLOSED_AREA: "74.699 ha" },
    geometry: { type: "Polygon", coordinates: [ring] } })) };
  const beforeBasins = JSON.stringify(response);
  const basins = await loadLayer(basinConfig);
  assert.equal(JSON.stringify(response), beforeBasins, "Source data must remain unchanged");
  assert.equal(basins.entities.values.length, 4, "No auxiliary outlines or duplicate fills");
  const expected = { 71: "#3DD563", 77: "#E775CA", 82: "#7F9B8E", 83: "#DD70EE" };
  const time = cesium.JulianDate.now();
  for (const entity of basins.entities.values) {
    const id = entity.properties.STREAM_ID.getValue(time);
    const color = entity.polygon.material.color.getValue(time);
    assert.ok(cesium.Color.equals(color, cesium.Color.fromCssColorString(expected[id])));
    assert.equal(color.alpha, 1);
    assert.equal(entity.polygon.outline.getValue(time), false);
    assert.equal(entity.polygon.zIndex.getValue(time), 5);
    assert.equal(entity.polygon.extrudedHeight, undefined);
    assert.equal(entity.polygon.hierarchy.getValue(time).positions.length, ring.length);
    assert.equal(readVectorPopup(entity).title, `Microbacia ${id}`);
    assert.equal(readVectorPopup(entity).fields.map(field => field.value).join("|"), "74.699 ha|4.728 km|69");
  }
  for (const opacity of [0, 0.35, 1, 0.65, 1]) {
    setVectorOpacity(basins, opacity);
    for (const entity of basins.entities.values) assert.equal(entity.polygon.material.color.getValue(time).alpha, opacity);
  }
  response = { type: "FeatureCollection", features: Array.from({ length: 193 }, (_, i) => ({ type: "Feature", id: 7,
    properties: { STREAM_ID: i % 12, STRAHLER: i % 4 + 1, IN_FLOW: 1, OUT_FLOW: 2, DRAIN_AREA: "1.029 ha", LENGTH: "64.738 m", LENGTH_3D: "65.779 m", BEARING: "0", SINUOSITY: "1.0287829" },
    geometry: { type: "LineString", coordinates: [[-45.32, -21.35, 950], [-45.319, -21.349, 940]] } })) };
  const beforeLines = JSON.stringify(response);
  const lines = await loadLayer(lineConfig);
  assert.equal(JSON.stringify(response), beforeLines);
  assert.equal(lines.entities.values.length, 193);
  assert.equal(new Set(lines.entities.values.map(entity => entity.id)).size, 193);
  for (const entity of lines.entities.values) {
    const order = entity.properties.STRAHLER.getValue(time);
    assert.equal(entity.polyline.width.getValue(time), [1, 1.5, 2.5, 3][order - 1]);
    assert.equal(entity.polyline.clampToGround.getValue(time), true);
    assert.equal(entity.polyline.zIndex.getValue(time), 10 + order);
    assert.ok(cesium.Color.equals(entity.polyline.material.color.getValue(time), cesium.Color.fromCssColorString(order < 3 ? "#00FFFF" : "#0066FF")));
    entity.polyline.positions.getValue(time).forEach(position => assert.ok(Math.abs(cesium.Cartographic.fromCartesian(position).height) < 1e-6));
    assert.match(readVectorPopup(entity).title, /^Trecho /);
    assert.equal(readVectorPopup(entity).fields.map(field => field.value).join("|"), `${order}|1.029 ha|64.738 m|65.779 m|1.0287829`);
  }
  const sources = new cesium.DataSourceCollection();
  const parcel = new cesium.Entity({ polygon: { hierarchy: cesium.Cartesian3.fromDegreesArray([-45.32, -21.35, -45.319, -21.35, -45.319, -21.349]), zIndex: 2 } });
  registerVectorPopup(parcel, { title: "Parcel", fields: [] });
  const basin = basins.entities.values[0];
  const mainChannel = lines.entities.values.find(entity => entity.properties.STRAHLER.getValue(time) === 4);
  assert.equal(resolveVectorPopupSelection(parcel, [basin]), basin, "Pick the visible microbasin above an obscured parcel");
  assert.equal(resolveVectorPopupSelection(basin, [mainChannel]), mainChannel, "Drainage wins over the fill");
  const measurement = new cesium.Entity();
  assert.equal(resolveVectorPopupSelection(measurement, [basin, mainChannel]), measurement);
  setVectorOpacity(basins, 0);
  assert.equal(resolveVectorPopupSelection(parcel, [basin]), parcel, "Transparent fills must not intercept picking");
  setVectorOpacity(basins, 1);
  const viewer = { isDestroyed: () => false, dataSources: sources };
  await attachLayer(viewer, basins);
  await attachLayer(viewer, lines);
  for (let i = 0; i < 4; i++) {
    basins.show = false;
    lines.show = false;
    assert.ok(basins.entities.values.every(entity => !entity.isShowing));
    assert.ok(lines.entities.values.every(entity => !entity.isShowing));
    basins.show = true;
    lines.show = true;
    assert.equal(basins.entities.values.length, 4);
    assert.equal(lines.entities.values.length, 193);
    assert.equal(sources.length, 2);
  }
  removeLayer(viewer, basins);
  removeLayer(viewer, lines);
  assert.equal(sources.length, 0);
  sources.destroy();
  console.log("ANA passed: deterministic classifications, unchanged stepped geometry/attributes, 2D drainage copy, 193 unique IDs, ground priority, opacity, unit-preserving popups and visibility/removal cycles.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
