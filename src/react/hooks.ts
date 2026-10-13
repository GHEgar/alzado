import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Alzado, AlzadoSnapshot, CameraGroup, CameraMap } from '../core/index.js';

export type UseAlzado = AlzadoSnapshot & Pick<Alzado, 'enter' | 'exit' | 'setPitch' | 'setTerrain'> & {
    toggle(): void;
};

export function useAlzado(alzado: Alzado): UseAlzado {
    const snapshot = useSyncExternalStore(alzado.subscribe, alzado.getSnapshot, alzado.getSnapshot);
    const actions = useMemo(() => ({
        enter: alzado.enter,
        exit: alzado.exit,
        setPitch: alzado.setPitch,
        setTerrain: alzado.setTerrain,
        toggle: () => (alzado.getSnapshot().active ? alzado.exit() : alzado.enter()),
    }), [alzado]);
    return { ...snapshot, ...actions };
}

export function useCameraGroup(map: CameraMap | null, group: CameraGroup): void {
    useEffect(() => (map ? group.add(map) : undefined), [map, group]);
}
