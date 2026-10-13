import View from 'ol/View.js';
import { describe, expect, it } from 'vitest';
import { createAlzado, DEFAULT_TERRAIN_SOURCE, demSource } from '../src/core/index.js';
import { createFakeMap } from './fake-map.js';

const view = (): View => new View({ center: [0, 0], zoom: 4 });

describe('terreno', () => {
    it('arma un raster-dem con codificación custom sin claves vacías', () => {
        const spec = demSource({ tiles: ['https://dem.test/{z}/{x}/{y}.png'], encoding: 'custom', redFactor: 256, greenFactor: 1, blueFactor: 0, baseShift: 0 });
        expect(spec).toEqual({
            type: 'raster-dem',
            tileSize: 256,
            tiles: ['https://dem.test/{z}/{x}/{y}.png'],
            encoding: 'custom',
            redFactor: 256,
            greenFactor: 1,
            blueFactor: 0,
            baseShift: 0,
        });
    });

    it('agrega la fuente y activa el terreno con su exageración', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: view(), map, terrain: { source: { tiles: ['x'] }, exaggeration: 1.5 } });
        expect(map.sources.has(DEFAULT_TERRAIN_SOURCE)).toBe(true);
        expect(map.terrain).toEqual({ source: DEFAULT_TERRAIN_SOURCE, exaggeration: 1.5 });
        alzado.setTerrain({ exaggeration: 3 });
        expect(map.terrain?.exaggeration).toBe(3);
        alzado.setTerrain({ enabled: false });
        expect(map.terrain).toBeNull();
        expect(alzado.getSnapshot().terrain).toEqual({ enabled: false, exaggeration: 3 });
    });

    it('usa una fuente que ya trae el estilo', () => {
        const map = createFakeMap();
        createAlzado({ view: view(), map, terrain: { source: 'dem' } });
        expect(map.sources.size).toBe(0);
        expect(map.terrain).toEqual({ source: 'dem', exaggeration: 1 });
    });

    it('espera al estilo y lo repone tras un setStyle', () => {
        const map = createFakeMap({}, false);
        createAlzado({ view: view(), map, terrain: { source: { tiles: ['x'] }, sourceId: 'dem' } });
        expect(map.terrain).toBeNull();
        map.loadStyle();
        expect(map.sources.has('dem')).toBe(true);
        expect(map.terrain?.source).toBe('dem');
        map.terrain = null;
        map.loadStyle();
        expect(map.terrain).toMatchObject({ source: 'dem' });
    });

    it('sin opciones de terreno no toca el mapa', () => {
        const map = createFakeMap();
        const alzado = createAlzado({ view: view(), map });
        alzado.setTerrain({ exaggeration: 2 });
        expect(map.terrain).toBeNull();
        expect(alzado.getSnapshot().terrain).toBeNull();
    });
});
