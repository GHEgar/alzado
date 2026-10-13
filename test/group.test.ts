import { describe, expect, it, vi } from 'vitest';
import { createCameraGroup } from '../src/core/index.js';
import { createFakeMap } from './fake-map.js';

describe('createCameraGroup', () => {
    it('el nuevo miembro toma la cámara del primero', () => {
        const group = createCameraGroup();
        const a = createFakeMap({ center: [-103, 20], zoom: 9, bearing: 30, pitch: 55 });
        const b = createFakeMap();
        group.add(a);
        group.add(b);
        expect(b.camera).toEqual(a.camera);
    });

    it('copia el movimiento a los demás sin rebote', () => {
        const group = createCameraGroup();
        const a = createFakeMap();
        const b = createFakeMap();
        const c = createFakeMap();
        [a, b, c].forEach(group.add);
        const jumpA = vi.spyOn(a, 'jumpTo');
        b.drag({ zoom: 7, bearing: -20 });
        expect(a.camera).toEqual(b.camera);
        expect(c.camera).toEqual(b.camera);
        expect(jumpA).toHaveBeenCalledTimes(1);
    });

    it('al quitar un miembro deja de seguirlo', () => {
        const group = createCameraGroup();
        const a = createFakeMap();
        const b = createFakeMap();
        group.add(a);
        const remove = group.add(b);
        remove();
        b.drag({ zoom: 5 });
        expect(a.camera.zoom).toBe(0);
        expect(group.members()).toEqual([a]);
        group.destroy();
        expect(group.members()).toEqual([]);
    });
});
