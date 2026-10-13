import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import { fromLonLat } from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';

export const START = { center: [-103.62, 19.51], zoom: 11 };

export function createOlMap(): { olMap: OlMap; view: View; overlay: TileLayer<TileWMS> } {
    const view = new View({ center: fromLonLat(START.center), zoom: START.zoom, constrainRotation: false });
    const overlay = new TileLayer({
        zIndex: 10,
        opacity: 0.8,
        source: new TileWMS({
            url: 'https://ows.terrestris.de/osm/service',
            params: { LAYERS: 'OSM-Overlay-WMS' },
        }),
    });
    const olMap = new OlMap({ layers: [new TileLayer({ source: new OSM() }), overlay], view });
    return { olMap, view, overlay };
}
