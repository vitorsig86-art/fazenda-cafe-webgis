# Repository Guidelines

This is Fazenda Café, one independent Cardeal Map WebGIS: React, TypeScript, Vite and CesiumJS. Preserve the generic architecture. Never modify cardeal-map-template or other reference projects while updating this project.

## Structure

- src/projects/: property-specific configuration, source URLs, bounds, zoom levels, labels, legends and opening/Home camera. fazendaCafe.ts is the active editable entry point; template.ts retains inactive generic test fixtures.
- src/cesium/: reusable viewer, camera, loaders and measurement utilities.
- src/hooks/: viewer, layer and measurement lifecycle.
- src/components/: reusable Portuguese UI and responsive CSS.
- public/legends/: image legend assets; example.png is illustrative.
- scripts/: local generic regression checks.
- agent/skills/, .agents/skills/, .claude/skills/: existing Cesium contributor guides; preserve reference files and junctions.

## Validation

Use npm.cmd on PowerShell if npm.ps1 is blocked. Run npm ci, npm run typecheck, npm run check and npm run build. Verify affected interactions in desktop/mobile browser and preview. Tests use synthetic data; validate remote URLs/CORS with the final project configuration.

Use two-space indentation, double-quoted imports, semicolons, PascalCase components, camelCase functions and use-prefixed hooks. Keep generic components independent of layer IDs/themes. Legends require PNG plus config only. Preserve the approved desktop layout and mobile drawer/backdrop/sticky header, compact cards/controls, tap-expand legends and native Cesium attribution.

Put property-specific defaults only in src/projects/fazendaCafe.ts. Invisible rasters/vectors are still loaded. Keep the main viewer and dedicated 3D ion tokens separate. Keep credentials out of commits; VITE_* values are browser visible. Never copy .env.local from another project. Do not commit node_modules, dist, caches or verification artifacts. Do not initialize Git, push, deploy or rewrite history unless requested.
