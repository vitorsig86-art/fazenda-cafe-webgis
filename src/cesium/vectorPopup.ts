import { JulianDate, type Entity } from "cesium";
import type { VectorPopupConfig } from "../projects/types";

const configurations = new WeakMap<Entity, VectorPopupConfig>();

export function registerVectorPopup(entity: Entity, config: VectorPopupConfig): void {
  configurations.set(entity, config);
}

export function readVectorPopup(entity: Entity | undefined) {
  const config = entity && configurations.get(entity);
  if (!config || !entity) return null;
  const properties = entity.properties?.getValue(JulianDate.now()) ?? {};
  return {
    title: config.title,
    fields: config.fields.map((field) => ({
      label: field.label,
      value: properties[field.property] == null ? "—" : `${properties[field.property]}${field.suffix ?? ""}`,
    })),
  };
}
