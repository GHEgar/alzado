import { readCamera, sameCamera } from './camera.js';
import type { CameraMap } from './types.js';

export interface CameraGroup {
    add(map: CameraMap): () => void;
    remove(map: CameraMap): void;
    members(): CameraMap[];
    destroy(): void;
}

export function createCameraGroup(): CameraGroup {
    const listeners = new Map<CameraMap, () => void>();
    let source: CameraMap | null = null;

    const follow = (origin: CameraMap): void => {
        if (source) return;
        source = origin;
        try {
            const camera = readCamera(origin);
            listeners.forEach((_, member) => {
                if (member !== origin && !sameCamera(readCamera(member), camera)) member.jumpTo(camera);
            });
        } finally {
            source = null;
        }
    };

    const group: CameraGroup = {
        add(map) {
            if (listeners.has(map)) return () => group.remove(map);
            const [reference] = listeners.keys();
            if (reference) map.jumpTo(readCamera(reference));
            const listener = (): void => follow(map);
            listeners.set(map, listener);
            map.on('move', listener);
            return () => group.remove(map);
        },
        remove(map) {
            const listener = listeners.get(map);
            if (!listener) return;
            map.off('move', listener);
            listeners.delete(map);
        },
        members: () => [...listeners.keys()],
        destroy() {
            [...listeners.keys()].forEach(group.remove);
        },
    };
    return group;
}
