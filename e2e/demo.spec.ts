import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const EXTERNAL = /tile\.openstreetmap\.org|elevation-tiles-prod|ows\.terrestris\.de/;

async function ready(page: Page): Promise<void> {
    await page.waitForFunction(() => {
        const map = window.demo?.map;
        return !!map && map.getStyle() !== undefined;
    });
}

async function enter(page: Page): Promise<void> {
    await page.getByTestId('toggle').click();
    await expect(page.getByTestId('toggle')).toHaveText('View in 2D');
}

async function exit(page: Page): Promise<void> {
    await page.getByTestId('toggle').click();
    await expect(page.getByTestId('toggle')).toHaveText('View in 3D');
}

const olState = (page: Page) => page.evaluate(() => {
    const view = window.demo?.olMap.getView();
    return { center: view?.getCenter() ?? [], zoom: view?.getZoom() ?? NaN, rotation: view?.getRotation() ?? NaN };
});

const mlState = (page: Page) => page.evaluate(() => {
    const map = window.demo?.map;
    return { zoom: map?.getZoom() ?? NaN, bearing: map?.getBearing() ?? NaN, pitch: map?.getPitch() ?? NaN };
});

test.beforeEach(async ({ page }) => {
    await page.route(EXTERNAL, (route) => route.abort());
    await page.goto('/');
    await ready(page);
});

test('entra a 3D con el pitch pedido y la vista de OpenLayers', async ({ page }) => {
    await expect(page.getByTestId('ml')).toBeHidden();
    await enter(page);
    await expect(page.getByTestId('ml')).toBeVisible();
    await expect(page.getByTestId('ol')).toBeHidden();
    const ml = await mlState(page);
    expect(ml.zoom).toBeCloseTo(10, 6);
    expect(ml.pitch).toBeCloseTo(60, 6);
    expect(ml.bearing).toBeCloseTo(0, 6);
});

test('girar e inclinar con el ratón vuelve a 2D con el rumbo', async ({ page }) => {
    await enter(page);
    const box = await page.getByTestId('ml').boundingBox();
    if (!box) throw new Error('sin caja');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x + 160, y - 60, { steps: 12 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);
    const ml = await mlState(page);
    expect(Math.abs(ml.bearing)).toBeGreaterThan(5);
    await expect(page.getByTestId('pitch')).toHaveText(`${Math.round(ml.pitch)}°`);
    await exit(page);
    const ol = await olState(page);
    expect(ol.rotation).toBeCloseTo(-ml.bearing * Math.PI / 180, 6);
    expect(ol.zoom).toBeCloseTo(ml.zoom + 1, 6);
});

test('diez idas y vueltas no dejan deriva', async ({ page }) => {
    await page.evaluate(() => window.demo?.olMap.getView().setRotation(0.4));
    const before = await olState(page);
    for (let i = 0; i < 10; i += 1) {
        await enter(page);
        await exit(page);
    }
    const after = await olState(page);
    expect(after.zoom).toBeCloseTo(before.zoom, 6);
    expect(after.rotation).toBeCloseTo(before.rotation, 6);
    expect(after.center[0]).toBeCloseTo(before.center[0] ?? NaN, 2);
    expect(after.center[1]).toBeCloseTo(before.center[1] ?? NaN, 2);
});

test('en vivo, mover el 3D mueve la vista 2D', async ({ page }) => {
    await enter(page);
    await page.evaluate(() => window.demo?.map?.jumpTo({ zoom: 12.5, bearing: 30 }));
    const ol = await olState(page);
    expect(ol.zoom).toBeCloseTo(13.5, 6);
    expect(ol.rotation).toBeCloseTo(-Math.PI / 6, 6);
});

test('el espejo WMS sigue la visibilidad de la capa', async ({ page }) => {
    const mirrored = () => page.evaluate(() => (window.demo?.map?.getStyle()?.layers ?? [])
        .map((layer) => layer.id)
        .filter((id) => id.startsWith('alzado-wms-')));
    const order = () => page.evaluate(() => (window.demo?.map?.getStyle()?.layers ?? []).map((layer) => layer.id));
    await expect.poll(mirrored).toHaveLength(1);
    const ids = await order();
    const [wms = ''] = await mirrored();
    expect(ids.indexOf(wms)).toBeLessThan(ids.indexOf('hillshade'));
    await page.getByLabel('WMS').uncheck();
    await expect.poll(mirrored).toHaveLength(0);
});

test('la cortina comparte la cámara entre los dos mapas 3D', async ({ page }) => {
    await enter(page);
    await page.getByLabel('Swipe').check();
    await page.waitForFunction(() => !!window.demo?.second);
    await page.evaluate(() => window.demo?.second?.jumpTo({ zoom: 9, bearing: -45, pitch: 30 }));
    const ml = await mlState(page);
    expect(ml.zoom).toBeCloseTo(9, 6);
    expect(ml.bearing).toBeCloseTo(-45, 6);
    expect(ml.pitch).toBeCloseTo(30, 6);
    const ol = await olState(page);
    expect(ol.zoom).toBeCloseTo(10, 6);
});

test('la cortina sigue la exageración del terreno', async ({ page }) => {
    await enter(page);
    await page.getByLabel('Swipe').check();
    await page.waitForFunction(() => window.demo?.second?.getTerrain()?.source === 'dem');
    await page.getByRole('slider', { name: 'Exaggeration' }).fill('3');
    await expect.poll(() => page.evaluate(() => window.demo?.second?.getTerrain()?.exaggeration)).toBe(3);
    await page.getByLabel('Terrain').uncheck();
    await expect.poll(() => page.evaluate(() => window.demo?.second?.getTerrain() ?? null)).toBeNull();
});
