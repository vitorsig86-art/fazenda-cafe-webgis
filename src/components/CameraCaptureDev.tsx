import { useState } from "react";
import type { Viewer } from "cesium";
import { captureCamera, prepareCameraCapture } from "../cesium/captureCamera";
import { createCameraView } from "../cesium/projectCamera";
import "./CameraCaptureDev.css";

// Imported only by the development branch in App; never part of production UI.
export default function CameraCaptureDev({ viewer }: { viewer: Viewer | null }) {
  const [captured, setCaptured] = useState<ReturnType<typeof prepareCameraCapture> | null>(null);
  const [message, setMessage] = useState("");
  const available = Boolean(viewer && !viewer.isDestroyed());

  async function capture() {
    if (!viewer || viewer.isDestroyed()) return;
    const result = prepareCameraCapture(captureCamera(viewer));
    setCaptured(result);
    setMessage("");
    try {
      await navigator.clipboard.writeText(result.text);
      setMessage("Objeto copiado para a área de transferência.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Selecione o objeto abaixo e copie.");
    }
  }

  function apply() {
    if (!viewer || viewer.isDestroyed() || !captured) return;
    viewer.camera.cancelFlight();
    viewer.camera.setView(createCameraView(captured.values));
    viewer.scene.requestRender();
    setMessage("Câmera capturada aplicada. A câmera inicial/Home permanece inalterada.");
  }

  return <section className="camera-capture-dev" aria-label="Captura de câmera de desenvolvimento">
    <small>Câmera · desenvolvimento</small>
    <div className="camera-capture-dev-actions">
      <button type="button" disabled={!available} onClick={() => void capture()}>Capturar câmera</button>
      <button type="button" disabled={!available || !captured} onClick={apply}>Aplicar câmera capturada</button>
    </div>
    {captured && <textarea aria-label="Objeto da câmera capturada" readOnly rows={8} value={captured.text} onFocus={(event) => event.currentTarget.select()} />}
    {message && <p role="status">{message}</p>}
  </section>;
}
