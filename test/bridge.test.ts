import View from 'ol/View.js';
import { fromLonLat } from 'ol/proj.js';
import { describe, expect, it, vi } from 'vitest';
import { createAlzado } from '../src/core/index.js';
import { createFakeMap } from './fake-map.js';

const createView = (): View => new View({
    center: fromLonLat([-103.35, 20.67]),
    zoom: 10,
    rotation: 0.3,
    constrainRotation: false,
});

describe('createAlzado', () => {
    it('al entrar lleva la vista al mapa 3D con el pitch pedido', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: createView(), map, pitch: 55 });
        alzado.enter();
        expect(alzado.getSnapshot().active).toBe(true);
        expect(map.camera.zoom).toBe(9);
        expect(map.camera.pitch).toBe(55);
        expect(map.camera.bearing).toBeCloseTo(-0.3 * 180 / Math.PI, 9);
    });

    it('al salir devuelve centro, zoom y rumbo a la vista', () => {
        const view = createView();
        const map = createFakeMap();
        const alzado = createAlzado({ view, map, mode: 'onSwitch' });
        alzado.enter();
        map.drag({ center: [-99.13, 19.43], zoom: 12, bearing: 90 });
        expect(view.getZoom()).toBe(10);
        alzado.exit();
        expect(view.getZoom()).toBeCloseTo(13, 9);
        expect(view.getRotation()).toBeCloseTo(-Math.PI / 2, 9);
        expect(alzado.getSnapshot().active).toBe(false);
    });

    it('en modo live sigue los dos sentidos sin rebotar', () => {
        const view = createView();
        const map = createFakeMap();
        const jumpTo = vi.spyOn(map, 'jumpTo');
        const alzado = createAlzado({ view, map });
        alzado.enter();
        jumpTo.mockClear();
        map.drag({ zoom: 11 });
        expect(view.getZoom()).toBeCloseTo(12, 9);
        expect(jumpTo).not.toHaveBeenCalled();
        view.setZoom(8);
        expect(map.camera.zoom).toBeCloseTo(7, 9);
        expect(jumpTo).toHaveBeenCalledTimes(1);
    });

    it('fuera de 3D no sincroniza nada', () => {
        const view = createView();
        const map = createFakeMap();
        createAlzado({ view, map });
        view.setZoom(5);
        expect(map.camera.zoom).toBe(0);
    });

    it('conserva el pitch pedido aunque el mapa lo baje por el terreno', () => {
        const view = createView();
        const map = createFakeMap();
        const alzado = createAlzado({ view, map, pitch: 70 });
        map.minPitchOverride = 40;
        alzado.enter();
        expect(map.camera.pitch).toBe(40);
        view.setZoom(11);
        expect(alzado.getSnapshot().pitch).toBe(70);
        map.minPitchOverride = null;
        alzado.exit();
        alzado.enter();
        expect(map.camera.pitch).toBe(70);
    });

    it('el pitch del usuario reemplaza al pedido', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: createView(), map, pitch: 30 });
        alzado.enter();
        map.drag({ pitch: 62 });
        expect(alzado.getSnapshot().pitch).toBe(62);
    });

    it('setPitch mueve el mapa activo', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: createView(), map });
        alzado.setPitch(45);
        expect(map.camera.pitch).toBe(0);
        alzado.enter();
        alzado.setPitch(50);
        expect(map.camera.pitch).toBe(50);
    });

    it('acepta el mapa después de entrar', () => {
        const alzado = createAlzado({ view: createView(), pitch: 20 });
        alzado.enter();
        expect(alzado.getCamera().zoom).toBe(9);
        const map = createFakeMap();
        alzado.setMap(map);
        expect(map.camera.pitch).toBe(20);
        alzado.setMap(null);
        map.drag({ zoom: 3 });
        expect(alzado.getCamera().zoom).toBe(9);
    });

    it('diez idas y vueltas no dejan deriva', () => {
        const view = createView();
        const map = createFakeMap();
        const alzado = createAlzado({ view, map, mode: 'onSwitch', pitch: 60 });
        const center = view.getCenter() ?? [];
        for (let i = 0; i < 10; i += 1) {
            alzado.enter();
            alzado.exit();
        }
        expect(view.getZoom()).toBeCloseTo(10, 9);
        expect(view.getRotation()).toBeCloseTo(0.3, 9);
        expect(view.getCenter()?.[0]).toBeCloseTo(center[0] ?? NaN, 6);
        expect(view.getCenter()?.[1]).toBeCloseTo(center[1] ?? NaN, 6);
    });

    it('avisa a los suscriptores y se limpia al destruir', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: createView(), map });
        const listener = vi.fn();
        alzado.subscribe(listener);
        alzado.enter();
        expect(listener).toHaveBeenCalled();
        alzado.destroy();
        map.drag({ zoom: 2 });
        expect(alzado.getCamera().zoom).toBe(9);
    });
});
