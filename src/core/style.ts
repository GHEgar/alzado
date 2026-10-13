import type { StyledMap } from './types.js';

export function styleReady(map: StyledMap): boolean {
    return map.getStyle() !== undefined;
}

export function onStyle(map: StyledMap, apply: () => void): () => void {
    if (styleReady(map)) apply();
    map.on('style.load', apply);
    return () => {
        map.off('style.load', apply);
    };
}
