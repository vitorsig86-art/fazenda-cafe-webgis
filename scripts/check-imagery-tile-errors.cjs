const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

module.exports = async function checkImageryTileErrors() {
  const exports = {};
  const timers = new Map();
  let nextTimer = 0;
  const diagnostics = { debug: [], warn: [] };
  const root = path.join(__dirname, "..");
  const code = ts.transpileModule(fs.readFileSync(path.join(root, "src/cesium/imageryTileErrors.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    Promise,
    console: { debug: (...args) => diagnostics.debug.push(args), warn: (...args) => diagnostics.warn.push(args) },
    setTimeout: (callback, delay) => { assert.equal(delay, 15000); timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
  });
  const { createImageryTileErrorHandler } = exports;
  const flushTimers = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); };
  const missing = (x = 1, statusCode = 404) => ({ x, y: 2, level: 12, error: { statusCode }, retry: true });
  const definition = name => ({ id: `arbitrary-${name}`, name, source: { format: "tms", url: "https://example.invalid/{z}/{x}/{reverseY}.png" } });

  for (const name of ["Ortomosaico", "MDT", "MDS", "Declividade", "Orientação solar", "Future raster"]) {
    const warnings = [];
    let resolveImage;
    const promise = new Promise(resolve => { resolveImage = resolve; });
    const args = [1, 2, 12, {}];
    const provider = { requestImage(...received) { assert.equal(this, provider); assert.deepEqual(received, args); return promise; } };
    const original = provider.requestImage;
    const before = diagnostics.debug.length;
    const handle = createImageryTileErrorHandler(definition(name), message => warnings.push(message), true, provider);
    assert.equal(provider.requestImage(...args), promise, "Return Cesium's original promise unchanged");
    for (let i = 0; i < 500; i++) { const error = missing(i, i % 2 ? 404 : 410); handle(error); assert.equal(error.retry, false); }
    assert.equal(warnings.length, 0, "Panning across edge tiles does not emit fatal warnings");
    assert.equal(diagnostics.debug.length - before, 1, "At most one missing-tile diagnostic per provider");
    assert.equal(timers.size, 1);
    resolveImage({});
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(timers.size, 0, "A valid tile cancels the no-imagery diagnostic");
    for (let i = 0; i < 500; i++) handle(missing(i));
    flushTimers();
    assert.equal(warnings.length, 0);
    // Authentication/server/network/CORS and provider-level 404 remain visible.
    for (const error of [missing(1, 401), missing(1, 403), missing(1, 500),
      { x: 1, y: 2, level: 12, error: new Error("Network/CORS failure") },
      { error: { statusCode: 404 } }, { ...missing(), x: -1 }]) handle(error);
    assert.equal(warnings.length, 6);
    handle.dispose();
    assert.equal(provider.requestImage, original, "Cleanup restores the original method");
    handle(missing(1, 500));
    assert.equal(warnings.length, 6);
  }

  const warnings = [];
  const provider = { requestImage: () => undefined };
  const handle = createImageryTileErrorHandler(definition("Broken source"), message => warnings.push(message), false, provider);
  assert.equal(provider.requestImage(1, 2, 12), undefined, "Throttled requests remain undefined, not success");
  for (let i = 0; i < 100; i++) handle(missing(1));
  assert.equal(timers.size, 0, "Duplicates cannot make one missing tile fatal");
  for (let i = 0; i < 32; i++) handle(missing(i));
  assert.equal(warnings.length, 0, "Leave time for valid tiles to finish");
  flushTimers();
  assert.equal(warnings.length, 1, "An all-missing source still raises a useful warning");
  assert.match(warnings[0], /404\/410/);
  for (let i = 32; i < 1000; i++) handle(missing(i));
  flushTimers();
  assert.equal(warnings.length, 1, "A failed source does not flood notifications");
  handle.dispose();

  const pending = createImageryTileErrorHandler(definition("Removed source"), () => assert.fail("Disposed handler warned"), false, provider);
  for (let i = 0; i < 32; i++) pending(missing(i));
  pending.dispose();
  assert.equal(timers.size, 0, "Cleanup cancels pending diagnostics");

  const rejection = Promise.reject(new Error("request failed"));
  const rejectingProvider = { requestImage: () => rejection };
  const rejecting = createImageryTileErrorHandler(definition("Network error"), () => {}, false, rejectingProvider);
  assert.equal(rejectingProvider.requestImage(1, 2, 12), rejection);
  await assert.rejects(rejection, /request failed/);
  rejecting.dispose();

  const basemapProvider = { requestImage: () => undefined };
  const original = basemapProvider.requestImage;
  let basemapWarnings = 0;
  const basemap = createImageryTileErrorHandler({ name: "Base", source: { format: "ion-world-imagery" } }, () => basemapWarnings++, false, basemapProvider);
  assert.equal(basemapProvider.requestImage, original, "Bing/OSM request behavior is unchanged");
  basemap(missing());
  assert.equal(basemapWarnings, 1);
  basemap.dispose();
  console.log("Imagery errors passed: recoverable raster 404/410, repeated edge gaps, bounded diagnostics, real failures, all-missing source detection, request identity/throttling/rejections, cleanup and unchanged basemap behavior.");
};

if (require.main === module) module.exports().catch(error => { console.error(error); process.exitCode = 1; });
