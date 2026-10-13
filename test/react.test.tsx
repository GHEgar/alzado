import { act, renderHook } from '@testing-library/react';
import View from 'ol/View.js';
import { describe, expect, it } from 'vitest';
import { createAlzado, createCameraGroup } from '../src/core/index.js';
import { useAlzado, useCameraGroup } from '../src/react/index.js';
import { createFakeMap } from './fake-map.js';

describe('alzado/react', () => {
    it('useAlzado refleja el snapshot y alterna', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: new View({ center: [0, 0], zoom: 3 }), map, pitch: 40 });
        const { result } = renderHook(() => useAlzado(alzado));
        expect(result.current.active).toBe(false);
        act(() => result.current.toggle());
        expect(result.current.active).toBe(true);
        act(() => result.current.setPitch(65));
        expect(result.current.pitch).toBe(65);
        act(() => result.current.toggle());
        expect(result.current.active).toBe(false);
    });

    it('useCameraGroup agrega y quita el mapa', () => {
        const group = createCameraGroup();
        const map = createFakeMap();
        const { unmount } = renderHook(() => useCameraGroup(map, group));
        expect(group.members()).toEqual([map]);
        unmount();
        expect(group.members()).toEqual([]);
    });
});
