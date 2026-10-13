import { describe, expect, it } from 'vitest';
import { wmsTileUrl } from '../src/core/index.js';

const query = (url: string): URLSearchParams => new URLSearchParams(url.split('?')[1]);

describe('wmsTileUrl', () => {
    it('arma la plantilla con bbox y quita lo que pone MapLibre', () => {
        const url = wmsTileUrl('https://example.test/wms', {
            LAYERS: 'a,b', width: 999, BBOX: '1,2,3,4', TILED: true, CQL_FILTER: 'x > 1', sld_body: undefined,
        });
        const params = query(url);
        expect(url.startsWith('https://example.test/wms?')).toBe(true);
        expect(url.endsWith('&BBOX={bbox-epsg-3857}')).toBe(true);
        expect(params.get('LAYERS')).toBe('a,b');
        expect(params.get('WIDTH')).toBe('256');
        expect(params.get('CQL_FILTER')).toBe('x > 1');
        expect(params.has('TILED')).toBe(false);
        expect(params.has('SLD_BODY')).toBe(false);
    });

    it('usa CRS en 1.3.0, que es el valor por defecto, y SRS en 1.1.1', () => {
        expect(query(wmsTileUrl('https://example.test/wms', {})).get('CRS')).toBe('EPSG:3857');
        const old = query(wmsTileUrl('https://example.test/wms', { VERSION: '1.1.1' }));
        expect(old.get('SRS')).toBe('EPSG:3857');
        expect(old.has('CRS')).toBe(false);
    });

    it('resuelve rutas relativas contra baseUrl y respeta una query existente', () => {
        const url = wmsTileUrl('/geoserver/wms?map=x', {}, { baseUrl: 'https://maps.test/app/', tileSize: 512 });
        expect(url.startsWith('https://maps.test/geoserver/wms?map=x&SERVICE=WMS')).toBe(true);
        expect(query(url).get('HEIGHT')).toBe('512');
    });
});
