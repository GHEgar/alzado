import type { Map as MapLibreMap } from 'maplibre-gl';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAlzado, createCameraGroup, mirrorWmsLayers, type Alzado } from 'alzado';
import { useAlzado, useCameraGroup } from 'alzado/react';
import { Controls } from './Controls.js';
import { createMap, TERRAIN_TILES } from './maplibre.js';
import { createOlMap } from './openlayers.js';
import './styles.css';

declare global {
    interface Window {
        demo?: { alzado: Alzado; olMap: ReturnType<typeof createOlMap>['olMap']; map: MapLibreMap | null; second: MapLibreMap | null };
    }
}

function useMapLibre(container: React.RefObject<HTMLDivElement | null>, enabled: boolean, gray = false): MapLibreMap | null {
    const [map, setMap] = useState<MapLibreMap | null>(null);
    useEffect(() => {
        const element = container.current;
        if (!enabled || !element) return undefined;
        let created: MapLibreMap | null = null;
        let disposed = false;
        void createMap(element, gray).then((instance) => {
            if (disposed) {
                instance.remove();
                return;
            }
            created = instance;
            setMap(instance);
        });
        return () => {
            disposed = true;
            created?.remove();
            setMap(null);
        };
    }, [container, enabled, gray]);
    return map;
}

function App() {
    const { olMap, view, overlay } = useMemo(() => createOlMap(), []);
    const alzado = useMemo(() => createAlzado({
        view,
        pitch: 60,
        terrain: { source: TERRAIN_TILES, exaggeration: 1.5 },
    }), [view]);
    const group = useMemo(() => createCameraGroup(), []);
    const state = useAlzado(alzado);
    const [swipe, setSwipe] = useState(false);
    const olRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const secondRef = useRef<HTMLDivElement>(null);
    const map = useMapLibre(mainRef, true);
    const second = useMapLibre(secondRef, swipe && state.active, true);

    useEffect(() => {
        olMap.setTarget(olRef.current ?? undefined);
        return () => olMap.setTarget(undefined);
    }, [olMap]);

    useEffect(() => {
        alzado.setMap(map);
        if (!map) return undefined;
        const mirror = mirrorWmsLayers({ olMap, map, beforeId: 'hillshade' });
        return () => {
            mirror.destroy();
            alzado.setMap(null);
        };
    }, [alzado, map, olMap]);

    useEffect(() => () => alzado.destroy(), [alzado]);
    useCameraGroup(map, group);
    useCameraGroup(second, group);

    useEffect(() => {
        if (!second) return undefined;
        const apply = (): void => {
            second.setTerrain(state.terrain?.enabled ? { source: 'dem', exaggeration: state.terrain.exaggeration } : null);
        };
        if (second.getStyle() !== undefined) apply();
        second.on('style.load', apply);
        return () => {
            second.off('style.load', apply);
        };
    }, [second, state.terrain]);

    useEffect(() => {
        if (state.active) map?.resize();
        else olMap.updateSize();
    }, [state.active, map, olMap]);

    useEffect(() => {
        window.demo = { alzado, olMap, map, second };
    }, [alzado, olMap, map, second]);

    return (
        <main className="app">
            <Controls state={state} overlay={overlay} swipe={swipe} onSwipe={setSwipe} />
            <section className="stage" data-mode={state.active ? '3d' : '2d'}>
                <div ref={olRef} className="layer ol" data-testid="ol" />
                <div ref={mainRef} className="layer ml" data-testid="ml" />
                {swipe && state.active ? <div ref={secondRef} className="layer ml swipe" data-testid="swipe" /> : null}
            </section>
        </main>
    );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
