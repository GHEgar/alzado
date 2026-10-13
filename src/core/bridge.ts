import { unByKey } from 'ol/Observable.js';
import type View from 'ol/View.js';
import { applyCamera, readCamera, viewToCamera } from './camera.js';
import { createStore, type Listener } from './store.js';
import { bindTerrain, initialTerrain, type TerrainOptions, type TerrainState } from './terrain.js';
import type { AlzadoMap, Camera, MapEvent } from './types.js';

export type SyncMode = 'live' | 'onSwitch';

export interface AlzadoOptions {
    view: View;
    map?: AlzadoMap | null;
    mode?: SyncMode;
    zoomOffset?: number;
    pitch?: number;
    terrain?: TerrainOptions | null;
}

export interface AlzadoSnapshot {
    active: boolean;
    pitch: number;
    terrain: TerrainState | null;
}

export interface Alzado {
    enter(): void;
    exit(): void;
    setMap(map: AlzadoMap | null): void;
    setPitch(pitch: number): void;
    setTerrain(patch: Partial<TerrainState>): void;
    getCamera(): Camera;
    subscribe(listener: Listener): () => void;
    getSnapshot(): AlzadoSnapshot;
    destroy(): void;
}

const PITCH_EPSILON = 0.01;
const VIEW_EVENTS = ['change:center', 'change:resolution', 'change:rotation'] as const;

const noop = (): void => undefined;

export function createAlzado(options: AlzadoOptions): Alzado {
    const { view } = options;
    const mode = options.mode ?? 'live';
    const zoomOffset = options.zoomOffset;
    const cameraOptions = zoomOffset === undefined ? {} : { zoomOffset };
    const store = createStore<AlzadoSnapshot>({
        active: false,
        pitch: options.pitch ?? 0,
        terrain: initialTerrain(options.terrain),
    });
    let map: AlzadoMap | null = null;
    let syncing = false;
    let unbindSync = noop;
    let terrain: { apply(): void; detach(): void } | null = null;

    const guarded = (action: () => void): void => {
        if (syncing) return;
        syncing = true;
        try {
            action();
        } finally {
            syncing = false;
        }
    };

    const toMap = (): void => {
        const target = map;
        if (!target) return;
        guarded(() => target.jumpTo(viewToCamera(view, { ...cameraOptions, pitch: store.get().pitch })));
    };

    const toView = (): void => {
        const source = map;
        if (!source) return;
        guarded(() => applyCamera(view, readCamera(source), zoomOffset));
    };

    const onMapMove = (event: MapEvent): void => {
        if (syncing || !map) return;
        if (event.originalEvent !== undefined) {
            const pitch = map.getPitch();
            if (Math.abs(pitch - store.get().pitch) > PITCH_EPSILON) store.set({ pitch });
        }
        if (mode === 'live') toView();
    };

    const bindSync = (): void => {
        unbindSync();
        const target = map;
        if (!target || !store.get().active) return;
        target.on('move', onMapMove);
        const keys = mode === 'live' ? VIEW_EVENTS.map((type) => view.on(type, toMap)) : [];
        unbindSync = () => {
            target.off('move', onMapMove);
            unByKey(keys);
            unbindSync = noop;
        };
    };

    const bindMap = (next: AlzadoMap): void => {
        const terrainOptions = options.terrain;
        if (terrainOptions) {
            terrain = bindTerrain(next, terrainOptions, () => store.get().terrain ?? { enabled: false, exaggeration: 1 });
        }
    };

    const unbindMap = (): void => {
        unbindSync();
        terrain?.detach();
        terrain = null;
    };

    const alzado: Alzado = {
        enter() {
            if (store.get().active) return;
            store.set({ active: true });
            bindSync();
            toMap();
        },
        exit() {
            if (!store.get().active) return;
            toView();
            unbindSync();
            store.set({ active: false });
        },
        setMap(next) {
            if (next === map) return;
            unbindMap();
            map = next;
            if (!map) return;
            bindMap(map);
            bindSync();
            if (store.get().active) toMap();
        },
        setPitch(pitch) {
            store.set({ pitch });
            const target = map;
            if (target && store.get().active) guarded(() => target.jumpTo({ pitch }));
        },
        setTerrain(patch) {
            const current = store.get().terrain;
            if (!current) return;
            store.set({ terrain: { ...current, ...patch } });
            terrain?.apply();
        },
        getCamera: () => (map ? readCamera(map) : viewToCamera(view, { ...cameraOptions, pitch: store.get().pitch })),
        subscribe: store.subscribe,
        getSnapshot: store.get,
        destroy() {
            unbindMap();
            map = null;
        },
    };
    if (options.map) alzado.setMap(options.map);
    return alzado;
}
