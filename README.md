# alzado

Headless camera bridge between a 2D OpenLayers view and a 3D MapLibre map. The OpenLayers view keeps
center, zoom and rotation; alzado adds what OpenLayers lacks — pitch and terrain — and carries the
camera both ways, so turning the map in 3D comes back as rotation in 2D. It also mirrors your
OpenLayers WMS layers into MapLibre as raster tiles, and keeps several MapLibre maps on one camera.

It ships no UI: you own the buttons, sliders and styles.

```bash
npm install alzado ol maplibre-gl
```

```ts
import { createAlzado, mirrorWmsLayers } from 'alzado';
import maplibregl from 'maplibre-gl';

const alzado = createAlzado({
    view: olMap.getView(),
    pitch: 60,
    terrain: {
        source: { tiles: ['https://dem.example/{z}/{x}/{y}.png'], encoding: 'terrarium', maxzoom: 15 },
        exaggeration: 1.5,
    },
});

const map = new maplibregl.Map({ container, style, maxPitch: 85 });
alzado.setMap(map);
mirrorWmsLayers({ olMap, map, beforeId: 'hillshade' });

alzado.enter();
alzado.exit();
```

## What it does

| Feature | API |
|---|---|
| Camera both ways: center, zoom, bearing ⇄ rotation, pitch | `createAlzado`, `enter`, `exit`, `setPitch` |
| Sync on every move (`live`, default) or only when switching (`onSwitch`) | `mode` |
| Requested pitch survives when MapLibre lowers it to stay above the terrain | `getSnapshot().pitch` |
| Terrain from tiles (`mapbox`, `terrarium` or `custom` encoding), a full spec or a style source | `terrain`, `setTerrain`, `demSource` |
| Visible `TileWMS` and `ImageWMS` layers mirrored by order, opacity, visibility and zoom range | `mirrorWmsLayers` |
| One camera across several MapLibre maps (swipe, split view) | `createCameraGroup` |
| Pure conversions | `viewToCamera`, `cameraToView`, `applyCamera`, `wmsTileUrl` |

### React

```tsx
import { useAlzado, useCameraGroup } from 'alzado/react';

const { active, pitch, terrain, toggle, setPitch, setTerrain } = useAlzado(alzado);
useCameraGroup(map, group);
```

## Notes

- MapLibre zoom is OpenLayers zoom minus one in Web Mercator (`zoomOffset`, default `1`).
- OpenLayers snaps rotations under 5° to zero by default; pass `constrainRotation: false` to the
  view if small bearings must come back.
- A user gesture (an event with `originalEvent`) replaces the requested pitch; for programmatic
  changes call `setPitch`.
- Terrain and mirrored layers are re-added after `map.setStyle()`.
- alzado imports only types from `maplibre-gl`: you create and load the map.

## Development

```bash
npm test          # vitest
npm run lint
npm run typecheck
npm run build
npm run demo      # Vite demo, OSM + Terrarium terrain + a public WMS
npm run e2e       # Playwright against the demo
```

## License

AGPL-3.0-only
