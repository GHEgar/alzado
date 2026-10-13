import type { Map as MapLibreMap } from 'maplibre-gl';

type MapLibre = typeof import('maplibre-gl');

const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TERRAIN_TILES = { tiles: [TERRARIUM], encoding: 'terrarium' as const, maxzoom: 15 };

let pending: Promise<MapLibre> | null = null;

export function loadMapLibre(): Promise<MapLibre> {
    pending ??= Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
        import('maplibre-gl/dist/maplibre-gl.css'),
    ]).then(([maplibregl, worker]) => {
        maplibregl.setWorkerUrl(worker.default);
        return maplibregl;
    });
    return pending;
}

export async function createMap(container: HTMLElement, gray = false): Promise<MapLibreMap> {
    const maplibregl = await loadMapLibre();
    return new maplibregl.Map({
        container,
        maxPitch: 85,
        attributionControl: false,
        style: {
            version: 8,
            sources: {
                osm: { type: 'raster', tiles: [OSM], tileSize: 256, maxzoom: 19 },
                relief: { type: 'raster-dem', ...TERRAIN_TILES, tileSize: 256 },
                ...(gray ? { dem: { type: 'raster-dem' as const, ...TERRAIN_TILES, tileSize: 256 } } : {}),
            },
            ...(gray ? { terrain: { source: 'dem', exaggeration: 1.5 } } : {}),
            layers: [
                { id: 'background', type: 'background', paint: { 'background-color': '#f4f1ea' } },
                { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': gray ? -1 : 0 } },
                { id: 'hillshade', type: 'hillshade', source: 'relief', paint: { 'hillshade-exaggeration': 0.4 } },
            ],
        },
    });
}
