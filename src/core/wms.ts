const SKIPPED = new Set(['WIDTH', 'HEIGHT', 'BBOX', 'SRS', 'CRS', 'REQUEST', 'SERVICE', 'TILED']);

export type WmsParams = Record<string, unknown>;

export interface WmsTileOptions {
    tileSize?: number;
    baseUrl?: string;
}

function absolute(url: string, baseUrl: string | undefined): string {
    if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
    const base = baseUrl ?? (typeof location === 'undefined' ? undefined : location.href);
    return base ? new URL(url, base).href : url;
}

export function wmsTileUrl(url: string, params: WmsParams, options: WmsTileOptions = {}): string {
    const size = String(options.tileSize ?? 256);
    const query = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetMap', WIDTH: size, HEIGHT: size });
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || SKIPPED.has(key.toUpperCase())) return;
        query.set(key.toUpperCase(), String(value));
    });
    if (!query.has('VERSION')) query.set('VERSION', '1.3.0');
    if (!query.has('STYLES')) query.set('STYLES', '');
    if (!query.has('FORMAT')) query.set('FORMAT', 'image/png');
    if (!query.has('TRANSPARENT')) query.set('TRANSPARENT', 'true');
    query.set(query.get('VERSION') === '1.3.0' ? 'CRS' : 'SRS', 'EPSG:3857');
    const target = absolute(url, options.baseUrl);
    const separator = target.includes('?') ? (/[?&]$/.test(target) ? '' : '&') : '?';
    return `${target}${separator}${query.toString()}&BBOX={bbox-epsg-3857}`;
}
