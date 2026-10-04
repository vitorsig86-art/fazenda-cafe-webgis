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
    title: config.titleProperty && properties[config.titleProperty] != null ? String(properties[config.titleProperty]) : config.title,
    fields: config.fields.map((field) => {
      const value = properties[field.property];
      const formatted = field.numberFormat && typeof value === "number" && Number.isFinite(value)
        ? new Intl.NumberFormat(field.numberFormat.locale, {
          minimumFractionDigits: field.numberFormat.decimalPlaces,
          maximumFractionDigits: field.numberFormat.decimalPlaces,
        }).format(value)
        : String(value);
      return {
        label: field.label,
        value: value == null ? "—" : `${formatted}${field.suffix ?? ""}`,
      };
    }),
  };
}
