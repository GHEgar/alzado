import type { AlzadoMap, Camera, LayerMap, LayerSpecification, MapEvent, SourceSpecification } from '../src/core/index.js';

type Handler = (event: MapEvent) => void;

export interface FakeLayer {
    id: string;
    minzoom: number;
    maxzoom: number;
    opacity: unknown;
}

export type FakeMap = AlzadoMap & LayerMap & {
    camera: Camera;
    styleLoaded: boolean;
    sources: Map<string, { spec: SourceSpecification; tiles?: string[] }>;
    layers: FakeLayer[];
    terrain: { source: string; exaggeration: number } | null;
    minPitchOverride: number | null;
    emit(type: string, event?: MapEvent): void;
    drag(camera: Partial<Camera>): void;
    loadStyle(): void;
};

export function createFakeMap(camera: Partial<Camera> = {}, styleLoaded = true): FakeMap {
    const handlers = new Map<string, Set<Handler>>();
    const order = (id: string, beforeId?: string): number => {
        const index = beforeId ? fake.layers.findIndex((layer) => layer.id === beforeId) : -1;
        return index < 0 ? fake.layers.length : index;
    };
    const fake: FakeMap = {
        camera: { center: [0, 0], zoom: 0, bearing: 0, pitch: 0, ...camera },
        styleLoaded,
        sources: new Map(),
        layers: [],
        terrain: null,
        minPitchOverride: null,
        getCenter: () => ({ lng: fake.camera.center[0], lat: fake.camera.center[1] }),
        getZoom: () => fake.camera.zoom,
        getBearing: () => fake.camera.bearing,
        getPitch: () => fake.camera.pitch,
        jumpTo(options) {
            fake.camera = { ...fake.camera, ...options };
            if (fake.minPitchOverride !== null) fake.camera.pitch = Math.min(fake.camera.pitch, fake.minPitchOverride);
            fake.emit('move', {});
            return fake;
        },
        on(type: string, handler: Handler) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type)?.add(handler);
            return fake;
        },
        off(type: string, handler: Handler) {
            handlers.get(type)?.delete(handler);
            return fake;
        },
        emit(type, event = {}) {
            [...handlers.get(type) ?? []].forEach((handler) => handler(event));
        },
        drag(next) {
            fake.camera = { ...fake.camera, ...next };
            fake.emit('move', { originalEvent: new Event('mousemove') });
        },
        loadStyle() {
            fake.styleLoaded = true;
            fake.sources.clear();
            fake.layers = [];
            fake.emit('style.load');
        },
        getStyle: () => (fake.styleLoaded ? { version: 8 } : undefined),
        getSource(id) {
            const entry = fake.sources.get(id);
            if (!entry) return undefined;
            return { ...entry, setTiles: (tiles: string[]) => fake.sources.set(id, { ...entry, tiles }) };
        },
        addSource(id, spec) {
            if (fake.sources.has(id)) throw new Error(`source ${id} exists`);
            const tiles = 'tiles' in spec ? spec.tiles : undefined;
            fake.sources.set(id, tiles ? { spec, tiles } : { spec });
        },
        removeSource(id) {
            fake.sources.delete(id);
        },
        setTerrain(terrain) {
            fake.terrain = terrain;
        },
        getLayer: (id) => fake.layers.find((layer) => layer.id === id),
        addLayer(layer: LayerSpecification, beforeId?: string) {
            const raster = layer as { id: string; minzoom?: number; maxzoom?: number; paint?: Record<string, unknown> };
            fake.layers.splice(order(raster.id, beforeId), 0, {
                id: raster.id,
                minzoom: raster.minzoom ?? 0,
                maxzoom: raster.maxzoom ?? 24,
                opacity: raster.paint?.['raster-opacity'],
            });
        },
        removeLayer(id) {
            fake.layers = fake.layers.filter((layer) => layer.id !== id);
        },
        moveLayer(id, beforeId) {
            const layer = fake.layers.find((item) => item.id === id);
            if (!layer) return;
            fake.layers = fake.layers.filter((item) => item !== layer);
            fake.layers.splice(order(id, beforeId), 0, layer);
        },
        setLayerZoomRange(id, minzoom, maxzoom) {
            const layer = fake.layers.find((item) => item.id === id);
            if (layer) Object.assign(layer, { minzoom, maxzoom });
        },
        setPaintProperty(id, name, value) {
            const layer = fake.layers.find((item) => item.id === id);
            if (layer && name === 'raster-opacity') layer.opacity = value;
        },
    };
    return fake;
}
