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
  layerGroups: [
    { id: "basemap", title: "Mapa base", layerIds: ["basemap"] },
    { id: "drone-rasters", title: "Rasters de drone", layerIds: ["ortomosaico", "mds", "mdt", "declividade", "orientacao-solar"] },
    { id: "drone-vectors", title: "Vetores de drone", layerIds: ["talhoes", "curvas", "drenagem"] },
    { id: "macro", title: "Análise Macro", layerIds: ["dem-macro", "curvas-5m-macro", "drenagem-ana", "microbacias-ana", "pedologia-ibge", "limites-municipais", "limite-microbacia-ana"] },
    { id: "model", title: "Modelo 3D", layerIds: ["modelo-3d"] },
  ],
  layers: [
    {
      id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap", defaultVisible: true,
      source: { format: "ion-world-imagery", fallback: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>', maximumLevel: 19 } },
    },
    raster("dem-macro", "Modelo de Elevação ANADEM", "raster", "macro", [-67.5, -21.943045533, -45.0, 0.0], 4, 13),
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
      id: "curvas", name: "Curvas de Nível 2 m", description: "Curvas de nível de 2 metros", kind: "contours", defaultVisible: false,
      source: { format: "geojson", url: `${baseUrl}/geojson/curvas_2m.geojson`, autoZoom: false,
        style: { stroke: "#000000", strokeWidth: 1, clampToGround: true, zIndex: 1 },
        popup: { title: "Curva de nível", fields: [{ property: "ELEVATION", label: "Cota", suffix: " m" }] },
      },
    },
    {
      id: "curvas-5m-macro", name: "Curvas de nível 5 m (Macro)", description: "Curvas de nível de 5 metros (Macro)", kind: "contours", defaultVisible: false,
      source: { format: "geojson", url: `${baseUrl}/geojson/curvas_5m_macro.geojson`, autoZoom: false,
        style: { stroke: "#3A3A3A", strokeWidth: 1.5, clampToGround: true, zIndex: 1 },
        popup: { title: "Curva de nível", fields: [{ property: "ELEVATION", label: "Cota" }] },
      },
    },
    {
      id: "drenagem", name: "Linhas de drenagem", description: "Rede de drenagem", kind: "drainage", defaultVisible: false,
      source: { format: "geojson", url: `${baseUrl}/geojson/drenagem.geojson`, autoZoom: false,
        style: { stroke: "#168bff", strokeWidth: 2, clampToGround: true, zIndex: 1 },
      },
    },
    {
      id: "microbacias-ana", name: "Microbacia de Captação Macro", description: "Microbacias delimitadas pela rede ANA", kind: "vector", defaultVisible: false, opacityControl: true,
      source: {
        format: "geojson", url: `${baseUrl}/geojson/microbacias-ana.geojson`, autoZoom: false, uniqueFeatureIds: true,
        style: {
          stroke: "#7F9B8E", strokeWidth: 1, fill: "#7F9B8E", polygonOutline: false, clampToGround: true, zIndex: 5,
          classification: { property: "STREAM_ID", classes: {
            "71": { fill: "#3DD563" },
            "77": { fill: "#E775CA" },
            "82": { fill: "#7F9B8E" },
            "83": { fill: "#DD70EE" },
          } },
        },
        popup: { title: "Microbacia", titleProperty: "STREAM_ID", titlePrefix: "Microbacia ", fields: [
          { property: "ENCLOSED_AREA", label: "Área" },
          { property: "PERIMETER", label: "Perímetro" },
          { property: "NEXT_STREAM_ID", label: "Próximo trecho" },
        ] },
      },
      legend: { type: "image", title: "Microbacias ANA", imageUrl: "/legends/microbacias-ana.png", imageAlt: "Microbacias ANA: 71 verde #3DD563; 77 rosa #E775CA; 82 verde acinzentado #7F9B8E; 83 violeta #DD70EE" },
    },
    {
      id: "drenagem-ana", name: "Drenagem ANA", description: "Rede ANA classificada por ordem da drenagem", kind: "drainage", defaultVisible: false,
      source: {
        format: "geojson", url: `${baseUrl}/geojson/drenagem_ana.geojson`, autoZoom: false, ignoreAltitude: true, uniqueFeatureIds: true,
        style: {
          stroke: "#00A8FF", strokeWidth: 2, clampToGround: true, zIndex: 11,
          classification: { property: "nuordemcda", classes: {
            "5": { stroke: "#00A8FF", strokeWidth: 2, zIndex: 11 },
            "6": { stroke: "#0057D9", strokeWidth: 3.5, zIndex: 12 },
          } },
        },
        popup: { title: "Drenagem ANA", hideEmptyFields: true, normalizeWhitespace: true, fields: [
          { property: "nuordemcda", label: "Ordem da drenagem" },
          { property: "nunivotcda", label: "Nível" },
          { property: "nucompcda", label: "Comprimento", numberFormat: { locale: "pt-BR", decimalPlaces: 3, parseNumericString: true }, suffix: " km" },
          { property: "nuareabacc", label: "Área da bacia contribuinte", numberFormat: { locale: "pt-BR", decimalPlaces: 3, parseNumericString: true }, suffix: " km²" },
          { property: "cocursodag", label: "Código do curso d'água" },
          { property: "dsversao", label: "Base ANA" },
        ] },
      },
    },
    {
      id: "pedologia-ibge", name: "Pedologia IBGE", description: "Mapeamento de solos IBGE para contexto macro", kind: "vector", defaultVisible: false,
      source: {
        format: "geojson", url: `${baseUrl}/geojson/pedologia_ibge.geojson`, autoZoom: false,
        style: { stroke: "#795548", strokeWidth: 2, fill: "rgba(184, 135, 91, 0.30)", clampToGround: true, zIndex: 1 },
        popup: {
          title: "Pedologia IBGE", hideEmptyFields: true, normalizeWhitespace: true,
          fields: [
            { property: "nom_unidad", label: "Unidade" },
            { property: "legenda", label: "Classe de solo" },
            { property: "ordem", label: "Ordem" },
            { property: "subordem", label: "Subordem" },
            { property: "grande_gru", label: "Grande grupo" },
            { property: "subgrupos", label: "Subgrupo" },
            { property: "textura", label: "Textura" },
            { property: "horizonte", label: "Horizonte A" },
            { property: "relevo", label: "Relevo" },
            { property: "componente", label: "Composição da unidade" },
            { property: "inclu_p1", label: "Inclusões" },
          ],
        },
      },
    },
    {
      id: "limites-municipais", name: "Limites Municipais", description: "Limites municipais para contexto macro", kind: "vector", defaultVisible: false,
      source: {
        format: "geojson", url: `${baseUrl}/geojson/limite_municipios.geojson`, autoZoom: false,
        style: { stroke: "#8B3A3A", strokeWidth: 3, fill: "rgba(139, 58, 58, 0.05)", clampToGround: true, zIndex: 1 },
        popup: {
          title: "Limites municipais", titleProperty: "NM_MUN", hideEmptyFields: true, normalizeWhitespace: true,
          fields: [
            { property: "NM_MUN", label: "Município" },
            { property: "SIGLA_UF", label: "UF" },
            { property: "CD_MUN", label: "Código IBGE" },
            { property: "AREA_KM2", label: "Área municipal", numberFormat: { locale: "pt-BR", decimalPlaces: 3 }, suffix: " km²" },
          ],
        },
      },
    },
    {
      id: "limite-microbacia-ana", name: "Limite da Microbacia ANA", description: "Limite da microbacia ANA para contexto macro", kind: "vector", defaultVisible: false,
      source: {
        format: "geojson", url: `${baseUrl}/geojson/limite_microbacia_ana.geojson`, autoZoom: false,
        style: { stroke: "#2E7D32", strokeWidth: 3, fill: "rgba(46, 125, 50, 0.04)", clampToGround: true, zIndex: 1 },
        popup: {
          title: "Microbacia ANA", hideEmptyFields: true, normalizeWhitespace: true,
          fields: [
            { property: "wts_cd_pfafstetterbasin", label: "Código Pfafstetter" },
            { property: "wts_cd_pfafstetterbasincodeleve", label: "Nível" },
            { property: "wts_gm_area", label: "Área", numberFormat: { locale: "pt-BR", decimalPlaces: 3, parseNumericString: true }, suffix: " km²" },
          ],
        },
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
