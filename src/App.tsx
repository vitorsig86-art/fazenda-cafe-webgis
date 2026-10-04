import { useState } from "react";
import { Cesium3DTileset } from "cesium";
import { ModelHeightAdjustment } from "./components/ModelHeightAdjustment";
import { ModelTerrainCutout } from "./components/ModelTerrainCutout";
import { projects } from "./projects";
import { LayerPanel } from "./components/LayerPanel";
import { Legend } from "./components/Legend";
import { NavigationControls } from "./components/NavigationControls";
import { MeasurementToolbar } from "./components/MeasurementToolbar";
import { VectorPopup } from "./components/VectorPopup";
import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useProjectLayers } from "./hooks/useProjectLayers";
import type { ProjectConfig } from "./projects/types";

function defaultVisibility(project: ProjectConfig) {
  return new Set(project.layers.filter((layer) => layer.defaultVisible).map((layer) => layer.id));
}

export function App() {
  const project = projects[0];
  const [visible, setVisible] = useState(() => defaultVisibility(projects[0]));
  const [panelOpen, setPanelOpen] = useState(false);
  const { containerRef, viewer, error } = useCesiumViewer();
  const { mapWarning, rasterOpacities, setRasterOpacity, loadedLayers, statuses } = useProjectLayers(viewer, project, visible);
  const legendLayers = project.layers.filter((layer) => layer.legend && visible.has(layer.id));

  function toggleLayer(id: string) {
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="app-shell">
      <div ref={containerRef} className="map-container" aria-label="Mapa 3D interativo do projeto" />
      <header className="app-header">
        <a className="brand" href="/" aria-label="Página inicial do Cardeal Map Viewer">
          <img src="/logo-cardeal.png" alt="" />
          <span><strong>CARDEAL</strong><span>Map Viewer</span></span>
        </a>
        <span className="header-divider" />
        <span className="header-context">Área de trabalho geoespacial</span>
        <button className="panel-toggle mobile-only" aria-expanded={panelOpen} aria-controls="layer-panel" onClick={() => setPanelOpen(!panelOpen)}>☰ <span>Camadas</span></button>
      </header>
      {panelOpen && <button type="button" className="drawer-backdrop" aria-label="Fechar painel de camadas" onClick={() => setPanelOpen(false)} />}
      <aside id="layer-panel" aria-label="Área de trabalho e camadas" className={`layer-panel ${panelOpen ? "is-open" : ""}`}>
        <LayerPanel project={project} visible={visible} rasterOpacities={rasterOpacities} onOpacityChange={setRasterOpacity} onToggle={toggleLayer} onClose={() => setPanelOpen(false)}
          renderModelControls={(layer) => {
            const loaded = loadedLayers.get(layer.id);
            const tileset = statuses[layer.id] === "ready" && loaded instanceof Cesium3DTileset ? loaded : null;
            return <>
              <ModelTerrainCutout viewer={viewer} tileset={tileset} clipping={layer.source.format === "3d-tiles" ? layer.source.clipping : undefined} defaultEnabled={layer.source.format === "3d-tiles" && layer.source.terrainCutout} visible={visible.has(layer.id)} />
              <ModelHeightAdjustment viewer={viewer} tileset={tileset} visible={visible.has(layer.id)} id={layer.id} configuredOffset={layer.source.format === "3d-tiles" ? layer.source.heightOffsetMeters : undefined} />
            </>;
          }} />
      </aside>
      <NavigationControls viewer={viewer} homeCamera={project.initialCamera} disabled={Boolean(error)} />
      <MeasurementToolbar viewer={viewer} disabled={Boolean(error)} />
      <VectorPopup viewer={viewer} />
      {(error || mapWarning) && <div role="alert" className="map-alert">{error || mapWarning}</div>}
      {!viewer && !error && <div role="status" className="map-alert">Iniciando o visualizador 3D…</div>}
      {legendLayers.length > 0 && <div className="raster-legend-stack" role="group" aria-label="Legendas das camadas visíveis" tabIndex={0}>
        {legendLayers.map((layer) => layer.legend && <Legend key={layer.id} {...layer.legend} visibility={visible.has(layer.id)} />)}
      </div>}
    </main>
  );
}
