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
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? (name === "./modelClipping" ? load("src/cesium/modelClipping.ts") : require(name)), testEnvironment: env, console });
  return exports;
}

async function main() {
  const { fazendaCafeProject: project } = load("src/projects/fazendaCafe.ts");
  const popup = load("src/cesium/vectorPopup.ts");
  const loader = load("src/cesium/loadLayer.ts", { "./vectorPopup": popup });
  assert.equal(project.layers.length, 10);
  assert.equal(project.layers.filter(layer => layer.defaultVisible).map(layer => layer.id).join(","), "basemap,ortomosaico,talhoes");
  assert.equal(project.layers.filter(layer => layer.legend).length, 4);
  assert.equal(project.layers.find(layer => layer.id === "ortomosaico").legend, undefined);
  for (const layer of project.layers.filter(layer => layer.legend)) {
    assert.equal(layer.legend.type, "image");
    assert.ok(fs.existsSync(path.join(root, "public", layer.legend.imageUrl)));
  }
  const expected = [
    ["ortomosaico", "orto", 12, 21, [-45.3515625, -21.371244371, -45.263671875, -21.289374356]],
    ["mds", "mds", 11, 20, [-45.3515625, -21.453068633, -45.17578125, -21.289374356]],
    ["mdt", "mdt", 11, 20, [-45.3515625, -21.453068633, -45.17578125, -21.289374356]],
    ["declividade", "decli", 11, 20, [-45.3515625, -21.453068633, -45.17578125, -21.289374356]],
    ["orientacao-solar", "aspect", 11, 20, [-45.3515625, -21.453068633, -45.17578125, -21.289374356]],
  ];
  for (const [id, folder, minimum, maximum, bounds] of expected) {
    const layer = project.layers.find(layer => layer.id === id);
    const source = layer.source;
    assert.equal(source.url, `https://pub-8fdc0414c75a4e0cbb31bd650aa041fb.r2.dev/${folder}/{z}/{x}/{reverseY}.png`);
    assert.equal(source.minimumLevel, minimum);
    assert.equal(source.maximumLevel, maximum);
    assert.equal(JSON.stringify(source.bounds), JSON.stringify(bounds));
    const loaded = await loader.loadLayer(layer);
    loader.assertImageryLayerReady(loaded);
    assert.equal(loaded.imageryProvider.tileWidth, 256);
    assert.equal(loaded.imageryProvider.tileHeight, 256);
    assert.ok(loaded.imageryProvider.tilingScheme instanceof cesium.WebMercatorTilingScheme);
    assert.equal(loaded.alpha, 1);
    loaded.destroy();
  }
  // Real Cesium entity properties, shared metadata and dynamic values.
  for (const [id, property, values, title, suffix] of [
    ["talhoes", "nome", ["TRAVESSIA", "PINHEIRO", "ARANAS"], "Talhão", ""],
    ["curvas", "ELEVATION", [970, 972, 0], "Curva de nível", " m"],
  ]) {
    const config = project.layers.find(layer => layer.id === id).source.popup;
    const entity = new cesium.Entity({ properties: { [property]: values[0] } });
    popup.registerVectorPopup(entity, config);
    for (const value of values) {
      entity.properties[property].setValue(value);
      const result = popup.readVectorPopup(entity);
      assert.equal(result.title, title);
      assert.equal(result.fields[0].value, `${value}${suffix}`);
      if (id === "curvas") assert.equal(result.fields[0].label, "Cota");
    }
  }
  assert.equal(popup.readVectorPopup(new cesium.Entity()), null);
  // Test the actual loader with real polygon/contour entities, without network.
  const polygon = new cesium.Entity({
    properties: { nome: "Dynamic parcel" },
    polygon: { hierarchy: new cesium.PolygonHierarchy(cesium.Cartesian3.fromDegreesArray([-45.31, -21.33, -45.30, -21.33, -45.30, -21.32])) },
  });
  const dataSource = new cesium.GeoJsonDataSource();
  dataSource.entities.add(polygon);
  const vectorLoader = load("src/cesium/loadLayer.ts", {
    "./vectorPopup": popup,
    cesium: { ...cesium, GeoJsonDataSource: { load: async () => dataSource } },
  });
  await vectorLoader.loadLayer(project.layers.find(layer => layer.id === "talhoes"));
  assert.ok(polygon.polygon, "Light fill preserves interior picking");
  assert.equal(dataSource.entities.values.length, 2, "Ground outline is added");
  for (const entity of dataSource.entities.values) assert.equal(popup.readVectorPopup(entity).fields[0].value, "Dynamic parcel");
  const model = project.layers.find(layer => layer.kind === "3d-tiles");
  assert.equal(model.source.assetId, 5939302);
  assert.equal(model.source.tokenEnv, "VITE_CESIUM_3D_TOKEN");
  await assert.rejects(loader.loadLayer(model), /Configure VITE_CESIUM_3D_TOKEN/);
  let requested;
  const resource = {};
  const ionLoader = load("src/cesium/loadLayer.ts", {
    "./vectorPopup": popup,
    cesium: { ...cesium,
      IonResource: { fromAssetId: async (assetId, options) => { requested = { assetId, options }; return resource; } },
      Cesium3DTileset: { fromUrl: async value => { assert.equal(value, resource); return "loaded"; } },
    },
  }, { VITE_CESIUM_ION_TOKEN: "synthetic-main", VITE_CESIUM_3D_TOKEN: "synthetic-dedicated" });
  assert.equal(await ionLoader.loadLayer(model), "loaded");
  assert.equal(requested.assetId, 5939302);
  assert.equal(requested.options.accessToken, "synthetic-dedicated");
  assert.ok(!fs.existsSync(path.join(root, ".git")), "No copied template Git history");
  assert.ok(fs.readFileSync(path.join(root, ".gitignore"), "utf8").includes("*.local"));
  console.log("Fazenda Café passed: all five real Cesium raster providers, exact URLs/bounds/levels, defaults, dynamic parcel/contour properties, ground outlines, separate ion token routing and missing-token guard. Remote availability and browser layouts require separate validation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
