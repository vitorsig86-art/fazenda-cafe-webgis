import { Math as CesiumMath, type Viewer } from "cesium";
import type { CameraConfig } from "../projects/types";

export function captureCamera(viewer: Viewer): CameraConfig {
  const { camera } = viewer;
  const position = camera.positionCartographic;
  return {
    longitude: CesiumMath.toDegrees(position.longitude),
    latitude: CesiumMath.toDegrees(position.latitude),
    height: position.height,
    heading: CesiumMath.toDegrees(camera.heading),
    pitch: CesiumMath.toDegrees(camera.pitch),
    roll: CesiumMath.toDegrees(camera.roll),
  };
}

export function prepareCameraCapture(camera: CameraConfig) {
  const precision: Record<keyof CameraConfig, number> = {
    longitude: 7, latitude: 7, height: 2, heading: 2, pitch: 2, roll: 2,
  };
  const values = {} as CameraConfig;
  const fields = (Object.keys(precision) as (keyof CameraConfig)[]).map((field) => {
    const value = camera[field].toFixed(precision[field]);
    values[field] = Number(value);
    return `  ${field}: ${value}`;
  });
  return { values, text: `{\n${fields.join(",\n")}\n}` };
}
