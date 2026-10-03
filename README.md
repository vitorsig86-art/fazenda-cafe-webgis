# Fazenda Caf?

WebGIS independente baseado no Cardeal Map. A configura??o ativa est? em `src/projects/fazendaCafe.ts`; n?o h? seletor de projetos.

Consulte [PROJECT_REPORT.md](PROJECT_REPORT.md) para URLs, bounds, zoom, defaults, popups, ion 3D, arquivos alterados e resultados de valida??o.

## Executar

Use Node.js 22.14+ e npm. Copie `.env.example` para `.env.local` e preencha `VITE_CESIUM_ION_TOKEN` (Bing/World Terrain) e `VITE_CESIUM_3D_TOKEN` (conta separada do asset 5939302). N?o versione tokens.

```sh
npm ci
npm run typecheck
npm run check
npm run build
npm run dev
```

No PowerShell, use `npm.cmd` se necess?rio. Dev: http://127.0.0.1:5173. Preview: http://127.0.0.1:4173.

## C?mera e legendas

A c?mera atual ? tempor?ria e usa os bounds deste projeto. Execute `npm run capture-camera` para obter o comando de captura em desenvolvimento, e cole os valores em `initialCamera` de `fazendaCafe.ts`. A c?mera de abertura e Home compartilham a mesma configura??o.

Os rasters ainda n?o t?m legendas espec?ficas. Quando os PNGs corretos forem fornecidos, adicione os metadados `legend` na configura??o. O componente gen?rico permanece intacto.

N?o fazer push ou deploy nesta etapa.
