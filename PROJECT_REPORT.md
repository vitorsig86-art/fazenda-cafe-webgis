# Fazenda Café — primeira etapa

Projeto independente em `C:\Users\Usuario\Desktop\fazenda-cafe`, copiado de `cardeal-map-template` sem `.git`, credenciais locais ou pastas geradas. Não houve commit, push ou deploy. A arquitetura, CSS existente, legendas, medições, navegação, Home, viewer, terreno e ciclo de vida dos rasters foram preservados.

## Configuração ativa

`src/projects/fazendaCafe.ts` é a única configuração ativa. Nome: **Fazenda Café**. Subtítulo temporário: **Localização a definir (editável)**. Nenhum município foi inventado. Câmera temporária calculada a partir dos bounds do ortomosaico: longitude -45.3076171875, latitude -21.3303093635, altura 14000 m, heading 0°, pitch -90°, roll 0°. O workflow de captura continua disponível em desenvolvimento; a câmera final será definida depois.

Base R2: `https://pub-8fdc0414c75a4e0cbb31bd650aa041fb.r2.dev`.

Todos os rasters usam TMS, EPSG:3857, PNG, 256×256 e `{reverseY}`. Opacidade inicial: 100%, independente por raster. Sem legendas específicas ou faixas inventadas.

| Raster | URL relativa à base R2 | Bounds [west, south, east, north] | Zoom | Inicial |
| --- | --- | --- | --- | --- |
| Ortomosaico | `/orto/{z}/{x}/{reverseY}.png` | [-45.3515625, -21.371244371, -45.263671875, -21.289374356] | 12–21 | ON |
| Modelo Digital da Superfície | `/mds/{z}/{x}/{reverseY}.png` | [-45.3515625, -21.453068633, -45.17578125, -21.289374356] | 11–20 | OFF |
| Modelo Digital do Terreno | `/mdt/{z}/{x}/{reverseY}.png` | [-45.3515625, -21.453068633, -45.17578125, -21.289374356] | 11–20 | OFF |
| Declividade | `/decli/{z}/{x}/{reverseY}.png` | [-45.3515625, -21.453068633, -45.17578125, -21.289374356] | 11–20 | OFF |
| Orientação solar | `/aspect/{z}/{x}/{reverseY}.png` | [-45.3515625, -21.453068633, -45.17578125, -21.289374356] | 11–20 | OFF |

## Vetores e popups

URLs abaixo são relativas à mesma base R2. Todos os vetores usam `clampToGround` e `autoZoom: false`.

| Camada | URL | Estilo | Inicial | Popup |
| --- | --- | --- | --- | --- |
| Talhões | `/geojson/talhoes.geojson` | Contorno claro 2 px, preenchimento de aproximadamente 4% | ON | **Talhão**, seguido do valor dinâmico de `properties.nome` |
| Curvas de nível | `/geojson/curvas_2m.geojson` | Linha preta 1 px | OFF | **Curva de nível**, `Cota: [ELEVATION] m` |
| Linhas de drenagem | `/geojson/drenagem.geojson` | Linha azul 2 px | OFF | Sem popup elaborado |

Não há camada de limite da propriedade. O popup genérico usa configuração `title`/`fields`, sem nomes ou cotas fixos no componente. Os valores são renderizados como texto React. O loader associa os metadados às entidades originais e aos contornos auxiliares; o preenchimento leve permite clicar também no interior do talhão. O popup acompanha `viewer.selectedEntityChanged` e tem botão de fechar. Em mobile ele fica oculto enquanto o drawer está aberto.

## Modelo 3D e tokens

Modelo 3D inicia OFF e permanece na seção diferenciada existente. Configuração genérica: `format: "3d-tiles"`, `source: "ion"`, `assetId: 5939302`, `tokenEnv: "VITE_CESIUM_3D_TOKEN"`. Fontes URL continuam suportadas por `source: "url"` ou pelo formato anterior com `url`.

CesiumJS instalado: **1.146.0**, compatível com o lockfile. Inspeção do código instalado mostrou que `Cesium3DTileset.fromIonAssetId` resolve o asset sem encaminhar um token dedicado. Por isso o loader usa a API suportada:

```ts
const resource = await IonResource.fromAssetId(assetId, { accessToken });
return Cesium3DTileset.fromUrl(resource);
```

O token vem exclusivamente da variável configurada em `tokenEnv`. O loader não altera `Ion.defaultAccessToken`; Bing e World Terrain continuam usando `VITE_CESIUM_ION_TOKEN`. Erros de 3D não imprimem objetos ou URLs autenticadas. O asset é carregado somente quando ativado.

**`.env.local` não existe.** Copie `.env.example` e preencha os dois valores locais para testar os serviços ion. Nenhum token real foi copiado, escrito no código, exibido ou commitado. `.env.local` continua ignorado.

## Arquivos

Criados: `src/projects/fazendaCafe.ts`, `src/cesium/vectorPopup.ts`, `src/components/VectorPopup.tsx`, `src/components/VectorPopup.css`, `scripts/check-fazenda-cafe.cjs`, `PROJECT_REPORT.md`.

Modificados em relação ao template: `.env.example`, `AGENTS.md`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `scripts/capture-camera.cjs`, `scripts/check-projects.cjs`, `scripts/check-raster-lifecycle.cjs`, `src/App.tsx`, `src/cesium/imageryTileErrors.ts`, `src/cesium/loadLayer.ts`, `src/hooks/useProjectLayers.ts`, `src/projects/index.ts`, `src/projects/types.ts`, `src/vite-env.d.ts`.

O restante foi copiado do template. `template.ts` e a legenda ilustrativa continuam somente como fixtures inativas dos checks genéricos. Junctions de skills foram recriadas apontando para as cópias internas do novo projeto.

## Validação e pendências

- **PASSOU:** TypeScript do aplicativo e da configuração Vite.
- **PASSOU:** os quatro checks herdados, com pequenos ajustes nos harnesses para o registro ativo e os novos imports/metadados. Incluem medições, Home/câmera, grupos, sliders independentes, legendas e regressão de ciclo de vida de rasters.
- **PASSOU:** check específico da Fazenda Café: cinco providers Cesium reais inicializam; URLs, bounds, zoom, tile size e defaults exatos; valores dinâmicos de nome e ELEVATION, inclusive zero; metadados compartilhados com contornos; encaminhamento do token dedicado e guarda para token ausente.
- **Dependências:** `npm ci` foi tentado, mas o acesso ao registro foi bloqueado com EACCES; os caches estavam incompletos. Para executar os checks, foi feita uma cópia independente das dependências já instaladas localmente. Todas as versões presentes correspondem ao lockfile e nenhum pacote obrigatório está ausente.
- **BUILD BLOQUEADO:** `npm run build` passa pelo TypeScript, mas o esbuild falha com acesso negado ao ler um diretório ancestral (`../..`). A execução ampliada foi rejeitada pela política automática da sessão. Não há build de produção validado.
- **DADOS REMOTOS PENDENTES:** terminal sem acesso ao R2; navegador reportou `ERR_BLOCKED_BY_CLIENT` ao abrir Talhões; o fetch web também não conseguiu ler o arquivo. Isso não comprova erro no servidor. Os três GeoJSON estão configurados, mas o carregamento remoto/CORS e os tiles PNG precisam ser verificados em ambiente com acesso.
- **DESKTOP/MOBILE PENDENTES:** CSS existente preservado e checks locais do painel passaram, mas a validação visual e os cliques reais no mapa não foram concluídos: o dev server também falhou no esbuild. Testar desktop e mobile após liberar o ambiente.
- **ION PENDENTE:** fornecer ambos os tokens locais e validar Bing/World Terrain e asset 5939302. Depois capturar a câmera final.

Para concluir em um terminal sem as restrições desta sessão: `npm.cmd ci`, `npm.cmd run typecheck`, `npm.cmd run check`, `npm.cmd run build` e `npm.cmd run dev`. Não publicar nesta etapa.
