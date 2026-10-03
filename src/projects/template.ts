import type { GeographicBounds, ProjectConfig, ProjectLayerConfig } from "./types";

// EDIT: illustrative W/S/E/N extent in degrees, not a property boundary.
const bounds: GeographicBounds = [-1, -1, 1, 1];
const basemap: ProjectLayerConfig = {
  id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap",
  source: {
    format: "ion-world-imagery",
    fallback: {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
      maximumLevel: 19,
    },
  },
  defaultVisible: true,
};

// EDIT URLs, bounds, zoom levels, labels and legends, then add the configured
// entries to templateProject.layers. example.invalid is reserved for examples.
// Opt into allowMissingTiles only for verified sparse data.
export const exampleLayers: ProjectLayerConfig[] = [{
  id: "raster-example-a", name: "Raster A", description: "Descrição do seu raster", kind: "raster",
  source: {
    format: "tms", url: "https://example.invalid/raster-a/{z}/{x}/{reverseY}.png",
    credit: "Seu projeto", bounds, minimumLevel: 0, maximumLevel: 8,
    tileWidth: 256, tileHeight: 256, allowMissingTiles: false,
  },
  defaultVisible: false,
  legend: { type: "image", title: "Raster A", imageUrl: "/legends/example.png", imageAlt: "Legenda ilustrativa; substitua pelos valores do seu raster" },
}, {
  id: "raster-example-b", name: "Raster B", description: "Segundo raster independente", kind: "raster",
  source: {
    format: "tms", url: "https://example.invalid/raster-b/{z}/{x}/{reverseY}.png",
    credit: "Seu projeto", bounds, minimumLevel: 0, maximumLevel: 8,
    tileWidth: 256, tileHeight: 256, allowMissingTiles: false,
  },
  defaultVisible: false,
  legend: { type: "image", title: "Raster B", imageUrl: "/legends/example.png", imageAlt: "Legenda ilustrativa do segundo raster" },
}, {
  id: "vector-example", name: "Vetor", description: "Descrição do seu vetor", kind: "vector",
  source: {
    format: "geojson", url: "https://example.invalid/vector.geojson", autoZoom: false,
    style: { stroke: "#ff0000", strokeWidth: 3, fill: "#00000000", clampToGround: true, zIndex: 1 },
  },
  defaultVisible: false,
}, {
  id: "model-example", name: "Modelo 3D", description: "Descrição do seu modelo", kind: "3d-tiles",
  source: { format: "3d-tiles", url: "https://example.invalid/tileset.json" },
  defaultVisible: false,
}];

export const templateProject: ProjectConfig = {
  id: "seu-projeto", name: "Nome do projeto", location: "Município, UF", bounds,
  // EDIT: neutral globe view. Capture your final opening/Home view.
  // Angles in degrees, height in meters above the ellipsoid.
  initialCamera: { longitude: 0, latitude: 0, height: 20000000, heading: 0, pitch: -90, roll: 0 },
  // Examples are excluded: the stable loader eagerly loads rasters/vectors,
  // even when defaultVisible is false. A fresh clone never requests placeholders.
  layers: [basemap],
};
