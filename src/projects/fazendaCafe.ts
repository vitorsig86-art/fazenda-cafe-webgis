import type { GeographicBounds, ProjectConfig, ProjectLayerConfig } from "./types";

const baseUrl = "https://pub-8fdc0414c75a4e0cbb31bd650aa041fb.r2.dev";
const orthoBounds: GeographicBounds = [-45.3515625, -21.371244371, -45.263671875, -21.289374356];
const terrainBounds: GeographicBounds = [-45.3515625, -21.453068633, -45.17578125, -21.289374356];

function raster(id: string, name: string, kind: ProjectLayerConfig["kind"], folder: string, bounds: GeographicBounds, minimumLevel: number, maximumLevel: number, defaultVisible = false): ProjectLayerConfig {
  return {
    id, name, kind, description: name, defaultVisible,
    source: { format: "tms", url: `${baseUrl}/${folder}/{z}/{x}/{reverseY}.png`, credit: "Fazenda Café", bounds, minimumLevel, maximumLevel, tileWidth: 256, tileHeight: 256 },
  };
}

export const fazendaCafeProject: ProjectConfig = {
  id: "fazenda-cafe", name: "Fazenda Café", location: "Três Pontas - Minas Gerais", bounds: terrainBounds,
  // Final captured opening/Home scene. Position and orientation angles are degrees.
  initialCamera: {
    longitude: -45.3152512,
    latitude: -21.3484124,
    height: 2340.51,
    heading: 360.00,
    pitch: -90.00,
    roll: 0.00,
  },
  layers: [
    {
      id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap", defaultVisible: true,
      source: { format: "ion-world-imagery", fallback: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>', maximumLevel: 19 } },
    },
    raster("ortomosaico", "Ortomosaico", "orthomosaic", "orto", orthoBounds, 12, 21, true),
    {
      ...raster("mds", "Modelo Digital da Superfície", "dsm", "mds", terrainBounds, 11, 20),
      legend: { type: "image", title: "Modelo Digital da Superfície", imageUrl: "/mds_tab.png", imageAlt: "Legenda do Modelo Digital da Superfície" },
    },
    {
      ...raster("mdt", "Modelo Digital do Terreno", "dtm", "mdt", terrainBounds, 11, 20),
      legend: { type: "image", title: "Modelo Digital do Terreno", imageUrl: "/mdt_tab.png", imageAlt: "Legenda do Modelo Digital do Terreno" },
    },
    {
      ...raster("declividade", "Declividade", "slope", "decli", terrainBounds, 11, 20),
      legend: { type: "image", title: "Declividade", imageUrl: "/decli_tab.png", imageAlt: "Legenda de Declividade" },
    },
    {
      ...raster("orientacao-solar", "Orientação solar", "solar-orientation", "aspect", terrainBounds, 11, 20),
      legend: { type: "image", title: "Orientação solar", imageUrl: "/aspect_tab.png", imageAlt: "Legenda de Orientação solar" },
    },
    {
      id: "talhoes", name: "Talhões", description: "Talhões da fazenda", kind: "vector", defaultVisible: true,
      source: { format: "geojson", url: `${baseUrl}/geojson/talhoes.geojson`, autoZoom: false,
        style: {
          stroke: "#ffe6a3", strokeWidth: 2, fill: "#ffe6a30a", clampToGround: true, zIndex: 2,
          outline: {
            property: "indice", width: 3,
            colors: [
              "#E53935", "#FB8C00", "#FDD835", "#7CB342", "#00A86B", "#00ACC1",
              "#1E88E5", "#3949AB", "#8E24AA", "#D81B60", "#FF7043", "#26A69A",
            ],
          },
        },
        popup: {
          title: "Talhão", titleProperty: "nome",
          fields: [
            { property: "area_ha", label: "Área", numberFormat: { locale: "pt-BR", decimalPlaces: 2 }, suffix: " ha" },
            { property: "cafes_qtd", label: "Cafeeiros", numberFormat: { locale: "pt-BR", decimalPlaces: 0 } },
            { property: "cafes_ha", label: "Densidade", numberFormat: { locale: "pt-BR", decimalPlaces: 0 }, suffix: " plantas/ha" },
          ],
        },
      },
    },
    {
      id: "curvas", name: "Curvas de nível", description: "Curvas de nível de 2 metros", kind: "contours", defaultVisible: false,
      source: { format: "geojson", url: `${baseUrl}/geojson/curvas_2m.geojson`, autoZoom: false,
        style: { stroke: "#000000", strokeWidth: 1, clampToGround: true, zIndex: 1 },
        popup: { title: "Curva de nível", fields: [{ property: "ELEVATION", label: "Cota", suffix: " m" }] },
      },
    },
    {
      id: "drenagem", name: "Linhas de drenagem", description: "Rede de drenagem", kind: "drainage", defaultVisible: false,
      source: { format: "geojson", url: `${baseUrl}/geojson/drenagem.geojson`, autoZoom: false,
        style: { stroke: "#168bff", strokeWidth: 2, clampToGround: true, zIndex: 1 },
      },
    },
    {
      id: "modelo-3d", name: "Modelo 3D", description: "Modelo fotogramétrico via Cesium ion", kind: "3d-tiles", defaultVisible: false,
      source: {
        format: "3d-tiles", source: "ion", assetId: 5939302, tokenEnv: "VITE_CESIUM_3D_TOKEN",
        heightOffsetMeters: -4,
        terrainCutout: true,
        clipping: {
          inverse: true,
          positions: [
            [-45.3222291, -21.3484382],
            [-45.3206861, -21.3501904],
            [-45.3189752, -21.3508918],
            [-45.3169730, -21.3520057],
            [-45.3152134, -21.3523393],
            [-45.3135590, -21.3519980],
            [-45.3121273, -21.3521172],
            [-45.3112086, -21.3516402],
            [-45.3077969, -21.3479454],
            [-45.3124751, -21.3451875],
            [-45.3129942, -21.3456654],
            [-45.3138966, -21.3476007],
            [-45.3154342, -21.3479784],
            [-45.3165103, -21.3471242],
            [-45.3174875, -21.3459691],
            [-45.3200162, -21.3443803],
            [-45.3208249, -21.3442382],
            [-45.3217139, -21.3441927],
          ],
        },
      },
    },
  ],
};
