import type OlMap from 'ol/Map.js';
import type { EventsKey } from 'ol/events.js';
import type Layer from 'ol/layer/Layer.js';
import type { State } from 'ol/layer/Layer.js';
import { unByKey } from 'ol/Observable.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import TileWMS from 'ol/source/TileWMS.js';
import { getUid } from 'ol/util.js';
import { DEFAULT_ZOOM_OFFSET } from './camera.js';
import { onStyle, styleReady } from './style.js';
import type { LayerMap } from './types.js';
import { wmsTileUrl, type WmsParams } from './wms.js';

export interface MirrorOptions {
    olMap: OlMap;
    map: LayerMap;
    filter?: (layer: Layer) => boolean;
    params?: (layer: Layer) => WmsParams;
    beforeId?: string;
    prefix?: string;
    tileSize?: number;
    baseUrl?: string;
    zoomOffset?: number;
}

export interface WmsMirror {
    sync(): void;
    ids(): string[];
    destroy(): void;
}

interface Mirrored {
    url: string;
    minzoom: number;
    maxzoom: number;
    opacity: number;
}

interface TilesSource {
    setTiles?(tiles: string[]): unknown;
}

const MAX_ZOOM = 24;

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(0, zoom));

export function wmsEndpoint(layer: Layer): { url: string; params: WmsParams } | null {
    const source = layer.getSource();
    const url = source instanceof TileWMS
        ? source.getUrls()?.[0]
        : source instanceof ImageWMS ? source.getUrl() : undefined;
    if (!url || !(source instanceof TileWMS || source instanceof ImageWMS)) return null;
    return { url, params: source.getParams() as WmsParams };
}

export function mirrorWmsLayers(options: MirrorOptions): WmsMirror {
    const { olMap, map } = options;
    const prefix = options.prefix ?? 'alzado-wms-';
    const offset = options.zoomOffset ?? DEFAULT_ZOOM_OFFSET;
    const mirrored = new Map<string, Mirrored>();
    let scheduled = false;
    let groupKey: EventsKey | null = null;

    const describe = (state: State): [string, Mirrored] | null => {
        const endpoint = wmsEndpoint(state.layer);
        if (!endpoint) return null;
        const params = { ...endpoint.params, ...options.params?.(state.layer) };
        const tileOptions = {
            ...(options.tileSize === undefined ? {} : { tileSize: options.tileSize }),
            ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
        };
        return [`${prefix}${getUid(state.layer)}`, {
            url: wmsTileUrl(endpoint.url, params, tileOptions),
            minzoom: clampZoom(state.minZoom - offset),
            maxzoom: clampZoom(state.maxZoom - offset),
            opacity: state.opacity,
        }];
    };

    const wanted = (): [string, Mirrored][] => olMap.getLayerGroup().getLayerStatesArray()
        .filter((state) => state.visible && (options.filter?.(state.layer) ?? true))
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map(describe)
        .filter((entry): entry is [string, Mirrored] => entry !== null);

    const before = (): string | undefined => (
        options.beforeId && map.getLayer(options.beforeId) ? options.beforeId : undefined
    );

    const upsert = (id: string, next: Mirrored): void => {
        const previous = mirrored.get(id);
        if (!previous || !map.getSource(id)) {
            map.addSource(id, { type: 'raster', tiles: [next.url], tileSize: options.tileSize ?? 256 });
            map.addLayer({
                id,
                type: 'raster',
                source: id,
                minzoom: next.minzoom,
                maxzoom: next.maxzoom,
                paint: { 'raster-opacity': next.opacity, 'raster-fade-duration': 0 },
            }, before());
        } else {
            if (previous.url !== next.url) (map.getSource(id) as TilesSource).setTiles?.([next.url]);
            if (previous.minzoom !== next.minzoom || previous.maxzoom !== next.maxzoom) {
                map.setLayerZoomRange(id, next.minzoom, next.maxzoom);
            }
            if (previous.opacity !== next.opacity) map.setPaintProperty(id, 'raster-opacity', next.opacity);
        }
        mirrored.set(id, next);
    };

    const remove = (id: string): void => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
        mirrored.delete(id);
    };

    const sync = (): void => {
        scheduled = false;
        if (!styleReady(map)) return;
        const entries = wanted();
        const keep = new Set(entries.map(([id]) => id));
        [...mirrored.keys()].filter((id) => !keep.has(id)).forEach(remove);
        entries.forEach(([id, next]) => upsert(id, next));
        const beforeId = before();
        entries.forEach(([id]) => map.moveLayer(id, beforeId));
    };

    const schedule = (): void => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
            if (scheduled) sync();
        });
    };

    const watchGroup = (): void => {
        if (groupKey) unByKey(groupKey);
        groupKey = olMap.getLayerGroup().on('change', schedule);
    };

    const onLayerGroup = (): void => {
        watchGroup();
        schedule();
    };

    watchGroup();
    const layerGroupKey = olMap.on('change:layergroup', onLayerGroup);
    const detachStyle = onStyle(map, () => {
        mirrored.clear();
        sync();
    });

    return {
        sync,
        ids: () => [...mirrored.keys()],
        destroy() {
            scheduled = false;
            detachStyle();
            unByKey(layerGroupKey);
            if (groupKey) unByKey(groupKey);
            if (styleReady(map)) [...mirrored.keys()].forEach(remove);
            mirrored.clear();
        },
    };
}
