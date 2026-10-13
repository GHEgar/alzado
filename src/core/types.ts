import type { Map as MapLibreMap } from 'maplibre-gl';

export type SourceSpecification = Parameters<MapLibreMap['addSource']>[1];
export type LayerSpecification = Exclude<Parameters<MapLibreMap['addLayer']>[0], { render: unknown }>;
export type RasterDemSpecification = Extract<SourceSpecification, { type: 'raster-dem' }>;
export type RasterSpecification = Extract<SourceSpecification, { type: 'raster' }>;

export interface Camera {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
}

export interface LngLatLiteral {
    lng: number;
    lat: number;
}

export interface MapEvent {
    originalEvent?: unknown;
}

export type MapListener = (event: MapEvent) => void;

export interface CameraMap {
    getCenter(): LngLatLiteral;
    getZoom(): number;
    getBearing(): number;
    getPitch(): number;
    jumpTo(options: Partial<Camera>): unknown;
    on(type: 'move', listener: MapListener): unknown;
    off(type: 'move', listener: MapListener): unknown;
}

export interface StyledMap {
    getStyle(): unknown;
    on(type: 'style.load', listener: () => void): unknown;
    off(type: 'style.load', listener: () => void): unknown;
    getSource(id: string): unknown;
    addSource(id: string, source: SourceSpecification): unknown;
    removeSource(id: string): unknown;
}

export interface TerrainMap extends StyledMap {
    setTerrain(terrain: { source: string; exaggeration: number } | null): unknown;
}

export interface LayerMap extends StyledMap {
    getLayer(id: string): unknown;
    addLayer(layer: LayerSpecification, beforeId?: string): unknown;
    removeLayer(id: string): unknown;
    moveLayer(id: string, beforeId?: string): unknown;
    setLayerZoomRange(id: string, minzoom: number, maxzoom: number): unknown;
    setPaintProperty(id: string, name: string, value: unknown): unknown;
}

export type AlzadoMap = CameraMap & TerrainMap;
