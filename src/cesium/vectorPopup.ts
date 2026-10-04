import { ColorMaterialProperty, JulianDate, type Entity } from "cesium";
import type { VectorPopupConfig } from "../projects/types";

const configurations = new WeakMap<Entity, VectorPopupConfig>();

export function registerVectorPopup(entity: Entity, config: VectorPopupConfig): void {
  configurations.set(entity, config);
}

// Ground geometry draw order is not consistently reflected in Scene.pick.
// Resolve overlapping configured vectors by their draw priority, leaving
// measurement and other non-vector selection targets untouched.
export function resolveVectorPopupSelection(current: Entity | undefined, candidates: Entity[]): Entity | undefined {
  if (!current || !configurations.has(current)) return current;
  const time = JulianDate.now();
  let selected: Entity | undefined;
  let priority = -Infinity;
  for (const candidate of [current, ...candidates]) {
    if (!configurations.has(candidate) || !candidate.isShowing) continue;
    const graphics = candidate.polyline ?? candidate.polygon;
    const material = graphics?.material;
    if (material instanceof ColorMaterialProperty && material.color?.getValue(time)?.alpha === 0) continue;
    const zIndex = graphics?.zIndex?.getValue(time) ?? 0;
    if (zIndex > priority) {
      selected = candidate;
      priority = zIndex;
    }
  }
  return selected ?? current;
}

export function readVectorPopup(entity: Entity | undefined) {
  const config = entity && configurations.get(entity);
  if (!config || !entity) return null;
  const properties = entity.properties?.getValue(JulianDate.now()) ?? {};
  return {
    title: config.titleProperty && properties[config.titleProperty] != null ? `${config.titlePrefix ?? ""}${properties[config.titleProperty]}` : config.title,
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
