import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import LayerGroup from 'ol/layer/Group.js';
import ImageLayer from 'ol/layer/Image.js';
import TileLayer from 'ol/layer/Tile.js';
import ImageWMS from 'ol/source/ImageWMS.js';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';
import { describe, expect, it } from 'vitest';
import { mirrorWmsLayers } from '../src/core/index.js';
import { createFakeMap } from './fake-map.js';

const tick = (): Promise<void> => new Promise((resolve) => {
    queueMicrotask(resolve);
});

const wms = (layers: string, options: { zIndex?: number; opacity?: number; maxZoom?: number } = {}): TileLayer<TileWMS> => new TileLayer({
    source: new TileWMS({ url: 'https://wms.test/ows', params: { LAYERS: layers } }),
    ...options,
});

const setup = (layers: (TileLayer | ImageLayer<ImageWMS> | LayerGroup)[]) => {
    const olMap = new OlMap({ layers, view: new View({ center: [0, 0], zoom: 2 }) });
    const map = createFakeMap();
    map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem' });
    return { olMap, map };
};

describe('mirrorWmsLayers', () => {
    it('espeja solo las capas WMS visibles, en orden de zIndex y bajo beforeId', () => {
        const top = wms('top', { zIndex: 5 });
        const bottom = wms('bottom', { zIndex: 1, opacity: 0.5 });
        const image = new ImageLayer({ source: new ImageWMS({ url: 'https://wms.test/ows', params: { LAYERS: 'img' } }), zIndex: 3 });
        const hidden = wms('hidden');
        hidden.setVisible(false);
        const { olMap, map } = setup([top, new TileLayer({ source: new OSM() }), bottom, image, hidden]);
        const mirror = mirrorWmsLayers({ olMap, map, beforeId: 'hillshade' });
        expect(mirror.ids()).toHaveLength(3);
        const ids = map.layers.map((layer) => layer.id);
        expect(ids.at(-1)).toBe('hillshade');
        const tiles = ids.slice(0, 3).map((id) => map.sources.get(id)?.tiles?.[0] ?? '');
        expect(tiles.map((url) => new URLSearchParams(url.split('?')[1]).get('LAYERS'))).toEqual(['bottom', 'img', 'top']);
        expect(map.layers[0]?.opacity).toBe(0.5);
    });

    it('sigue visibilidad, opacidad, parámetros y zoom en vivo', async () => {
        const layer = wms('a');
        const { olMap, map } = setup([layer]);
        const mirror = mirrorWmsLayers({ olMap, map });
        const [id = ''] = mirror.ids();
        layer.setOpacity(0.25);
        layer.setMaxZoom(10);
        layer.getSource()?.updateParams({ CQL_FILTER: 'x=1' });
        await tick();
        expect(map.layers.find((item) => item.id === id)).toMatchObject({ opacity: 0.25, maxzoom: 9 });
        expect(map.sources.get(id)?.tiles?.[0]).toContain('CQL_FILTER=x%3D1');
        layer.setVisible(false);
        await tick();
        expect(map.sources.has(id)).toBe(false);
        expect(mirror.ids()).toEqual([]);
    });

    it('lee capas dentro de grupos con la opacidad efectiva', () => {
        const inner = wms('inner', { opacity: 0.5 });
        const { olMap, map } = setup([new LayerGroup({ layers: [inner], opacity: 0.5 })]);
        mirrorWmsLayers({ olMap, map });
        expect(map.layers.find((layer) => layer.id.startsWith('alzado-wms-'))?.opacity).toBe(0.25);
    });

    it('aplica filtro y parámetros del consumidor', () => {
        const keep = wms('keep');
        const skip = wms('skip');
        skip.set('mirror', false);
        const { olMap, map } = setup([keep, skip]);
        const mirror = mirrorWmsLayers({
            olMap,
            map,
            filter: (layer) => layer.get('mirror') !== false,
            params: () => ({ SLD_BODY: '<sld/>' }),
        });
        expect(mirror.ids()).toHaveLength(1);
        expect(map.sources.get(mirror.ids()[0] ?? '')?.tiles?.[0]).toContain('SLD_BODY=%3Csld%2F%3E');
    });

    it('repone las capas tras un setStyle y las quita al destruir', () => {
        const { olMap, map } = setup([wms('a')]);
        const mirror = mirrorWmsLayers({ olMap, map });
        map.loadStyle();
        expect(map.layers).toHaveLength(1);
        mirror.destroy();
        expect(map.layers).toHaveLength(0);
        expect(map.sources.size).toBe(0);
    });
});
