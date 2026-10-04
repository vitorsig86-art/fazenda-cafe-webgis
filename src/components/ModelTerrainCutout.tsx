import { useEffect, useRef, useState } from "react";
import { BoundingSphere, Cartesian3, Cartographic, ClippingPolygonCollection, HeadingPitchRange, Math as CesiumMath, type Cesium3DTileset, type Viewer } from "cesium";
import { createModelClipping } from "../cesium/modelClipping";
import type { ModelClippingConfig } from "../projects/types";

interface Props {
  viewer: Viewer | null;
  tileset: Cesium3DTileset | null;
  clipping: ModelClippingConfig | undefined;
  visible: boolean;
  defaultEnabled?: boolean;
}

export function ModelTerrainCutout({ viewer, tileset, clipping, visible, defaultEnabled = false }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [message, setMessage] = useState("");
  const collectionRef = useRef<ClippingPolygonCollection | null>(null);
  useEffect(() => {
    if (!viewer || viewer.isDestroyed() || !tileset || tileset.isDestroyed() || !clipping) return;
    const globe = viewer.scene.globe;
    if (!ClippingPolygonCollection.isSupported(viewer.scene)) {
      setMessage("Este navegador não suporta o recorte do terreno.");
      return;
    }
    if (globe.clippingPolygons) {
      setMessage("O terreno já possui um recorte; a comparação foi desativada para preservá-lo.");
      return;
    }
    // A collection has a single owner. Use fresh polygons for the globe,
    // complementary to the crop on the model; never share the tileset's collection.
    const collection = createModelClipping({ ...clipping, inverse: !clipping.inverse });
    collection.enabled = false;
    globe.clippingPolygons = collection;
    collectionRef.current = collection;
    setMessage("");
    return () => {
      if (collectionRef.current === collection) collectionRef.current = null;
      if (!viewer.isDestroyed() && globe.clippingPolygons === collection) {
        // Cesium's setter supports undefined and destroys the owned collection.
        (globe as { clippingPolygons: ClippingPolygonCollection | undefined }).clippingPolygons = undefined;
        viewer.scene.requestRender();
      }
    };
  }, [viewer, tileset, clipping]);

  useEffect(() => {
    const collection = collectionRef.current;
    if (!viewer || viewer.isDestroyed() || !collection) return;
    collection.enabled = enabled && visible && Boolean(tileset && !tileset.isDestroyed() && tileset.show);
    viewer.scene.requestRender();
  }, [viewer, tileset, clipping, enabled, visible]);

  if (!clipping) return null;
  return <div className="model-height-adjustment">
    <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
      <input type="checkbox" checked={enabled} disabled={!visible || !tileset || Boolean(message)} onChange={(event) => setEnabled(event.currentTarget.checked)} />
      Ocultar terreno sob o modelo
    </label>
    <button type="button" disabled={!visible || !tileset || !viewer} onClick={() => {
      if (viewer && !viewer.isDestroyed() && tileset && !tileset.isDestroyed()) {
        const modelHeight = Cartographic.fromCartesian(tileset.boundingSphere.center).height;
        const region = BoundingSphere.fromPoints(clipping.positions.map(([lon, lat]) => {
          const height = viewer.scene.globe.getHeight(Cartographic.fromDegrees(lon, lat)) ?? modelHeight;
          return Cartesian3.fromDegrees(lon, lat, height);
        }));
        viewer.camera.flyToBoundingSphere(region, {
          duration: 0, offset: new HeadingPitchRange(0, CesiumMath.toRadians(-25), region.radius * 2.5),
        });
      }
    }}>Ver encaixe em 3D</button>
    <p>{message || "Usa o mesmo limite do recorte. Desmarque para comparar; ocultar o modelo restaura o terreno."}</p>
  </div>;
}
