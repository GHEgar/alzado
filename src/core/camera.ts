import { fromLonLat, toLonLat } from 'ol/proj.js';
import type { ProjectionLike } from 'ol/proj.js';
import type View from 'ol/View.js';
import type { Camera, CameraMap } from './types.js';

export const DEFAULT_ZOOM_OFFSET = 1;

export interface CameraOptions {
    zoomOffset?: number;
    pitch?: number;
}

export interface ViewState {
    center: number[];
    zoom: number;
    rotation: number;
}

const DEGREES = 180 / Math.PI;

export function wrapDegrees(degrees: number): number {
    const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
    return wrapped === -180 ? 180 : wrapped;
}

function wrapRadians(radians: number): number {
    return wrapDegrees(radians * DEGREES) / DEGREES;
}

export function rotationToBearing(rotation: number): number {
    return wrapDegrees(-rotation * DEGREES) + 0;
}

export function bearingToRotation(bearing: number, current = 0): number {
    const target = -bearing / DEGREES;
    return current + wrapRadians(target - current) + 0;
}

function viewZoom(view: View): number {
    const zoom = view.getZoom();
    if (zoom !== undefined) return zoom;
    const resolution = view.getResolution();
    return resolution === undefined ? 0 : view.getZoomForResolution(resolution) ?? 0;
}

export function viewToCamera(view: View, options: CameraOptions = {}): Camera {
    const center = view.getCenter() ?? [0, 0];
    const [lng = 0, lat = 0] = toLonLat(center, view.getProjection());
    return {
        center: [lng, lat],
        zoom: viewZoom(view) - (options.zoomOffset ?? DEFAULT_ZOOM_OFFSET),
        bearing: rotationToBearing(view.getRotation()),
        pitch: options.pitch ?? 0,
    };
}

export function cameraToView(
    camera: Pick<Camera, 'center' | 'zoom' | 'bearing'>,
    options: { zoomOffset?: number; projection?: ProjectionLike; rotation?: number } = {},
): ViewState {
    return {
        center: fromLonLat(camera.center, options.projection),
        zoom: camera.zoom + (options.zoomOffset ?? DEFAULT_ZOOM_OFFSET),
        rotation: bearingToRotation(camera.bearing, options.rotation),
    };
}

export function readCamera(map: CameraMap): Camera {
    const { lng, lat } = map.getCenter();
    return { center: [lng, lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
}

export function applyCamera(view: View, camera: Pick<Camera, 'center' | 'zoom' | 'bearing'>, zoomOffset?: number): void {
    const state = cameraToView(camera, {
        projection: view.getProjection(),
        rotation: view.getRotation(),
        ...(zoomOffset === undefined ? {} : { zoomOffset }),
    });
    view.setCenter(state.center);
    view.setZoom(state.zoom);
    view.setRotation(state.rotation);
}

export function sameCamera(a: Camera, b: Camera, tolerance = 1e-9): boolean {
    return Math.abs(a.center[0] - b.center[0]) <= tolerance
        && Math.abs(a.center[1] - b.center[1]) <= tolerance
        && Math.abs(a.zoom - b.zoom) <= tolerance
        && Math.abs(wrapDegrees(a.bearing - b.bearing)) <= tolerance
        && Math.abs(a.pitch - b.pitch) <= tolerance;
}
