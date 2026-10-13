import { onStyle } from './style.js';
import type { RasterDemSpecification, TerrainMap } from './types.js';

export interface DemTiles {
    tiles: string[];
    encoding?: 'mapbox' | 'terrarium' | 'custom';
    tileSize?: number;
    minzoom?: number;
    maxzoom?: number;
    bounds?: [number, number, number, number];
    attribution?: string;
    redFactor?: number;
    greenFactor?: number;
    blueFactor?: number;
    baseShift?: number;
}

export interface TerrainOptions {
    source: string | DemTiles | RasterDemSpecification;
    sourceId?: string;
    exaggeration?: number;
    enabled?: boolean;
}

export interface TerrainState {
    enabled: boolean;
    exaggeration: number;
}

export const DEFAULT_TERRAIN_SOURCE = 'alzado-terrain';

export function demSource(dem: DemTiles): RasterDemSpecification {
    const spec: Record<string, unknown> = { type: 'raster-dem', tileSize: 256 };
    Object.entries(dem).forEach(([key, value]) => {
        if (value !== undefined) spec[key] = value;
    });
    return spec as RasterDemSpecification;
}

function toSpecification(source: DemTiles | RasterDemSpecification): RasterDemSpecification {
    return 'type' in source ? source : demSource(source);
}

export function initialTerrain(options: TerrainOptions | null | undefined): TerrainState | null {
    if (!options) return null;
    return { enabled: options.enabled ?? true, exaggeration: options.exaggeration ?? 1 };
}

export function bindTerrain(
    map: TerrainMap,
    options: TerrainOptions,
    getState: () => TerrainState,
): { apply(): void; detach(): void } {
    const { source } = options;
    const sourceId = typeof source === 'string' ? source : options.sourceId ?? DEFAULT_TERRAIN_SOURCE;
    const apply = (): void => {
        if (typeof source !== 'string' && !map.getSource(sourceId)) map.addSource(sourceId, toSpecification(source));
        const { enabled, exaggeration } = getState();
        map.setTerrain(enabled ? { source: sourceId, exaggeration } : null);
    };
    const detachStyle = onStyle(map, apply);
    return {
        apply: () => {
            if (map.getStyle() !== undefined) apply();
        },
        detach: detachStyle,
    };
}
