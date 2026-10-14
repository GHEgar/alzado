# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [No publicado]

### Agregado

- El espejo WMS convierte `minResolution` y `maxResolution` de cada capa en rango de zoom, combinado con
  `minZoom` y `maxZoom`.
- Demo: el mapa de la cortina sigue el terreno y la exageración del puente; los deslizadores tienen
  nombre accesible.

### Cambiado

- El demo está en inglés.

## [0.1.0] - 2026-10-13

### Agregado

- `createAlzado`: puente de cámara entre una vista de OpenLayers y un mapa MapLibre, con `enter`,
  `exit`, `setMap`, `setPitch`, `setTerrain`, snapshot y suscripción.
- Sincronía `live` (en cada movimiento) y `onSwitch` (al entrar y salir), con guarda contra rebotes.
- El rumbo viaja en los dos sentidos y vuelve como la rotación más cercana a la actual.
- Pitch pedido aparte del aplicado, para que el terreno no lo vaya bajando entre idas y vueltas.
- Terreno `raster-dem` desde teselas (`mapbox`, `terrarium` o `custom` con factores), spec completa o
  fuente del estilo, con exageración y apagado; se repone tras `setStyle`.
- `mirrorWmsLayers`: espejo de capas `TileWMS` e `ImageWMS` visibles, con orden por `zIndex`, opacidad
  efectiva de grupos, rango de zoom, filtro y parámetros extra.
- `createCameraGroup`: una cámara para varios mapas MapLibre.
- Conversiones puras: `viewToCamera`, `cameraToView`, `applyCamera`, `readCamera`, `wmsTileUrl`.
- `alzado/react`: `useAlzado` y `useCameraGroup`.
- Demo en Vite con OSM, terreno Terrarium, un WMS público y cortina entre dos mapas 3D.
