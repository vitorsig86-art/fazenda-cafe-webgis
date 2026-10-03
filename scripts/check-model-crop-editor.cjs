// Run the actual temporary component/controller with synthetic surfaces and a
// deterministic React effect scheduler. Real Cesium entities and polygons;
// no browser, WebGL, network, credentials or production assets are required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");
const root = path.join(__dirname, "..");
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? (name.endsWith(".css") ? {} : require(name)), ...globals });
  return exports;
}
class FakeHandler {
  static instances = [];
  constructor() { this.actions = new Map(); FakeHandler.instances.push(this); }
  setInputAction(fn, type) { this.actions.set(type, fn); }
  getInputAction(type) { return this.actions.get(type); }
  removeInputAction(type) { this.actions.delete(type); }
  destroy() { this.actions.clear(); this.destroyed = true; }
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node?.props) return [];
  return [node, ...elements(node.props.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  return node?.props ? text(node.props.children) : typeof node === "string" || typeof node === "number" ? `${node}` : "";
}
async function main() {
  const slots = [];
  let cursor = 0;
  let queued = [];
  const react = {
    useState(value) { const index = cursor++; const slot = slots[index] ??= { value }; return [slot.value, next => { slot.value = typeof next === "function" ? next(slot.value) : next; }]; },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useEffect(fn, deps) { const index = cursor++; const slot = slots[index] ??= {}; if (!slot.deps || deps.some((v, i) => v !== slot.deps[i])) { queued.push(() => { slot.cleanup?.(); slot.cleanup = fn(); }); slot.deps = deps; } },
  };
  const listeners = new Map();
  let measuring = false;
  const document = { querySelector: () => measuring ? {} : null, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  let copied = "";
  const clipboard = { writeText: async value => { copied = value; } };
  const utils = load("src/cesium/measurementUtils.ts");
  const clipping = load("src/cesium/modelClipping.ts");
  const Component = load("src/components/ModelCropDev.tsx", {
    react, cesium: { ...cesium, ScreenSpaceEventHandler: FakeHandler },
    "../cesium/modelClipping": clipping, "../cesium/measurementUtils": utils,
  }, { document, navigator: { clipboard }, Element: class {} }).default;
  const pick = new cesium.Cartesian2(1, 1);
  let nextPosition;
  const mainHandler = new FakeHandler();
  const originalClick = () => {};
  const originalDouble = () => {};
  mainHandler.setInputAction(originalClick, cesium.ScreenSpaceEventType.LEFT_CLICK);
  mainHandler.setInputAction(originalDouble, cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  const viewer = {
    isDestroyed: () => false, canvas: {}, screenSpaceEventHandler: mainHandler,
    camera: { getPickRay: () => ({}) }, dataSources: new cesium.DataSourceCollection(),
    scene: { context: { webgl2: true }, preRender: new cesium.Event(), requestRender() {},
      pickPositionSupported: true, pickPosition: () => nextPosition, globe: { pick: () => nextPosition } },
  };
  const tileset = { show: true, isDestroyed: () => false };
  let visible = true;
  function render() { cursor = 0; const result = Component({ viewer, tileset, visible }); const effects = queued; queued = []; effects.forEach(fn => fn()); return result; }
  const button = name => elements(render()).find(node => node.type === "button" && text(node) === name);
  function click(name) { const node = button(name); assert.ok(node, name); assert.equal(node.props.disabled, false, `${name} should be enabled`); node.props.onClick(); }
  render(); await Promise.resolve(); await Promise.resolve();
  assert.equal(tileset.clippingPolygons, undefined, "Full model before editing");
  click("Editar recorte 3D");
  click("Adicionar/Editar recorte");
  const editor = FakeHandler.instances.at(-1);
  assert.equal(mainHandler.getInputAction(cesium.ScreenSpaceEventType.LEFT_CLICK), undefined);
  function place(lon, lat) { nextPosition = cesium.Cartesian3.fromDegrees(lon, lat, 970); editor.getInputAction(cesium.ScreenSpaceEventType.LEFT_CLICK)({ position: pick }); }
  place(-45.316, -21.349); place(-45.313, -21.349);
  assert.equal(button("Fechar polígono / Aplicar recorte").props.disabled, true);
  place(-45.313, -21.346); place(-45.316, -21.346);
  const graphics = viewer.dataSources.get(0);
  assert.equal(graphics.name, "cardeal-model-crop-dev");
  assert.equal(graphics.entities.values.filter(entity => entity.point).length, 4);
  assert.equal(graphics.entities.values.filter(entity => entity.polyline).length, 1);
  click("Desfazer ponto");
  assert.equal(graphics.entities.values.filter(entity => entity.point).length, 3);
  place(-45.316, -21.346); click("Fechar polígono / Aplicar recorte");
  const completed = tileset.clippingPolygons;
  assert.equal(completed.inverse, true); assert.equal(completed.enabled, true);
  assert.equal(viewer.scene.globe.clippingPolygons, undefined);
  assert.equal(mainHandler.getInputAction(cesium.ScreenSpaceEventType.LEFT_CLICK), originalClick);
  assert.equal(mainHandler.getInputAction(cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK), originalDouble);
  click("Desativar preview"); assert.equal(completed.enabled, false);
  click("Ativar preview"); assert.equal(completed.enabled, true);
  click("Copiar coordenadas"); await Promise.resolve();
  assert.match(copied, /inverse: true/); assert.match(copied, /\[-45\.3160000, -21\.3490000\]/);
  assert.equal(elements(render()).find(node => node.type === "textarea").props.value, copied);
  click("Adicionar/Editar recorte"); click("Desfazer ponto");
  listeners.get("keydown")({ key: "Escape" });
  assert.equal(tileset.clippingPolygons, completed, "Esc must preserve the completed crop");
  assert.equal(graphics.entities.values.filter(entity => entity.point).length, 4);
  measuring = true; click("Adicionar/Editar recorte");
  assert.match(text(render()), /cancele a medição/);
  assert.equal(editor.getInputAction(cesium.ScreenSpaceEventType.LEFT_CLICK), undefined);
  measuring = false; click("Adicionar/Editar recorte");
  tileset.show = false; visible = false; viewer.scene.preRender.raiseEvent();
  assert.equal(button("Adicionar/Editar recorte").props.disabled, true);
  assert.equal(graphics.show, false); assert.equal(tileset.clippingPolygons, completed);
  tileset.show = true; visible = true; viewer.scene.preRender.raiseEvent();
  click("Limpar recorte"); assert.equal(completed.length, 0); assert.equal(completed.enabled, false);
  assert.equal(graphics.entities.values.length, 0);
  assert.equal(button("Copiar coordenadas").props.disabled, true);
  slots.forEach(slot => slot.cleanup?.());
  assert.equal(listeners.size, 0); assert.equal(viewer.dataSources.length, 0); assert.equal(editor.destroyed, true);
  // Optional built-output check; npm check must also work before the first build.
  if (fs.existsSync(path.join(root, "dist/assets"))) {
    const bundles = fs.readdirSync(path.join(root, "dist/assets")).filter(name => /\.(js|css)$/.test(name));
    for (const name of bundles) assert.doesNotMatch(fs.readFileSync(path.join(root, "dist/assets", name), "utf8"), /model-crop-dev|Editar recorte 3D/);
  }
  console.log("Crop editor passed: surface clicks, isolated visible vertices/edges, 3-point minimum, undo/apply, preview toggle, Esc preserves crop, geographic clipboard/panel, hidden model guard, measurement coexistence and clear/cleanup.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
