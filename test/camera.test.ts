import View from 'ol/View.js';
import { fromLonLat } from 'ol/proj.js';
import { describe, expect, it } from 'vitest';
import {
    applyCamera,
    bearingToRotation,
    cameraToView,
    rotationToBearing,
    viewToCamera,
    wrapDegrees,
} from '../src/core/index.js';

const view = (rotation = 0): View => new View({
    center: fromLonLat([-103.35, 20.67]),
    zoom: 10,
    rotation,
    constrainRotation: false,
});

describe('conversión de cámara', () => {
    it('lleva centro, zoom con desfase y rumbo con el signo invertido', () => {
        const camera = viewToCamera(view(Math.PI / 6), { pitch: 55 });
        expect(camera.center[0]).toBeCloseTo(-103.35, 9);
        expect(camera.center[1]).toBeCloseTo(20.67, 9);
        expect(camera.zoom).toBe(9);
        expect(camera.bearing).toBeCloseTo(-30, 9);
        expect(camera.pitch).toBe(55);
    });

    it('respeta un desfase de zoom propio', () => {
        expect(viewToCamera(view(), { zoomOffset: 0 }).zoom).toBe(10);
    });

    it('vuelve al mismo estado de la vista', () => {
        const original = view(-1.2);
        const camera = viewToCamera(original);
        const state = cameraToView(camera, { projection: 'EPSG:3857' });
        expect(state.zoom).toBeCloseTo(10, 9);
        expect(state.rotation).toBeCloseTo(-1.2, 9);
        expect(state.center[0]).toBeCloseTo(original.getCenter()?.[0] ?? NaN, 4);
    });

    it('normaliza ángulos a (-180, 180]', () => {
        expect(wrapDegrees(190)).toBe(-170);
        expect(wrapDegrees(-180)).toBe(180);
        expect(rotationToBearing(0)).toBe(0);
        expect(rotationToBearing(2 * Math.PI + 0.5)).toBeCloseTo(rotationToBearing(0.5), 9);
    });

    it('elige la rotación más cercana a la actual', () => {
        const current = 4 * Math.PI + 0.1;
        expect(bearingToRotation(rotationToBearing(0.2), current)).toBeCloseTo(4 * Math.PI + 0.2, 9);
    });

    it('aplica la cámara a la vista', () => {
        const target = view();
        applyCamera(target, { center: [-99.13, 19.43], zoom: 11, bearing: 45 });
        expect(target.getZoom()).toBeCloseTo(12, 9);
        expect(target.getRotation()).toBeCloseTo(-Math.PI / 4, 9);
    });
});
