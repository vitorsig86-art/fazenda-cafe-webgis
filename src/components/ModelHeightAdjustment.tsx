import { useEffect, useRef, useState } from "react";
import type { Cesium3DTileset, Viewer } from "cesium";
import { createModelHeightAdjustment } from "../cesium/modelHeight";
import "./ModelHeightAdjustment.css";

interface Props {
  viewer: Viewer | null;
  tileset: Cesium3DTileset | null;
  visible: boolean;
  id: string;
  configuredOffset?: number;
}

export function ModelHeightAdjustment({ viewer, tileset, visible, id, configuredOffset = 0 }: Props) {
  const [meters, setMeters] = useState(configuredOffset);
  const [draft, setDraft] = useState(String(configuredOffset));
  const adjustment = useRef<ReturnType<typeof createModelHeightAdjustment> | null>(null);
  useEffect(() => {
    setMeters(configuredOffset);
    setDraft(String(configuredOffset));
    if (!tileset || tileset.isDestroyed()) return;
    const controller = createModelHeightAdjustment(tileset);
    adjustment.current = controller;
    return () => {
      controller.reset();
      if (adjustment.current === controller) adjustment.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.scene.requestRender();
    };
  }, [viewer, tileset, configuredOffset]);

  const disabled = !visible || !tileset || tileset.isDestroyed() || !viewer || viewer.isDestroyed();
  function apply(value: number) {
    if (disabled || !Number.isFinite(value) || !adjustment.current) return;
    const next = Math.round(Math.min(100, Math.max(-100, value)) * 10) / 10;
    adjustment.current.set(next - configuredOffset);
    setMeters(next);
    setDraft(String(next));
    viewer!.scene.requestRender();
  }
  function commitDraft() {
    const value = draft.trim() ? Number(draft.replace(",", ".")) : NaN;
    if (Number.isFinite(value)) apply(value);
    else setDraft(String(meters));
  }

  return <details className="model-height-adjustment">
    <summary>Ajustar altura 3D</summary>
    <p>Negativo baixa o modelo; positivo sobe. Altura configurada: {configuredOffset} m.</p>
    {!tileset && <p role="status">Ative o modelo e aguarde o carregamento.</p>}
    <fieldset disabled={disabled}>
      <label htmlFor={`model-height-${id}`}>Deslocamento vertical (m)</label>
      <input id={`model-height-${id}`} type="text" inputMode="decimal" value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)} onBlur={commitDraft}
        onKeyDown={(event) => { if (event.key === "Enter") commitDraft(); }} />
      <input type="range" min={-100} max={100} step={0.1} value={meters}
        aria-label="Altura do modelo em metros" aria-valuetext={`${meters} metros`}
        onChange={(event) => apply(Number(event.currentTarget.value))} />
      <div className="model-height-buttons">
        <button type="button" onClick={() => apply(meters - 1)}>−1 m</button>
        <button type="button" onClick={() => apply(meters - 0.1)}>−0,1 m</button>
        <button type="button" onClick={() => apply(meters + 0.1)}>+0,1 m</button>
        <button type="button" onClick={() => apply(meters + 1)}>+1 m</button>
      </div>
      <button type="button" onClick={() => apply(configuredOffset)}>Restaurar altura configurada</button>
      <output aria-live="polite">Ajuste: {meters.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} m</output>
    </fieldset>
    <p>Ao recarregar a página, o ajuste volta à altura configurada de {configuredOffset} m.</p>
  </details>;
}
