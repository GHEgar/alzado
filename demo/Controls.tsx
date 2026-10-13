import type TileLayer from 'ol/layer/Tile.js';
import type TileWMS from 'ol/source/TileWMS.js';
import { useEffect, useState } from 'react';
import type { UseAlzado } from 'alzado/react';

interface ControlsProps {
    state: UseAlzado;
    overlay: TileLayer<TileWMS>;
    swipe: boolean;
    onSwipe(next: boolean): void;
}

function useOverlay(overlay: TileLayer<TileWMS>): { visible: boolean; opacity: number } {
    const read = (): { visible: boolean; opacity: number } => ({ visible: overlay.getVisible(), opacity: overlay.getOpacity() });
    const [state, setState] = useState(read);
    useEffect(() => {
        const listener = (): void => setState({ visible: overlay.getVisible(), opacity: overlay.getOpacity() });
        overlay.on('propertychange', listener);
        return () => overlay.un('propertychange', listener);
    }, [overlay]);
    return state;
}

export function Controls({ state, overlay, swipe, onSwipe }: ControlsProps) {
    const wms = useOverlay(overlay);
    const terrain = state.terrain ?? { enabled: false, exaggeration: 1 };
    return (
        <header className="toolbar">
            <button type="button" className="primary" data-testid="toggle" onClick={state.toggle}>
                {state.active ? 'Ver en 2D' : 'Ver en 3D'}
            </button>
            <label>
                Pitch <output data-testid="pitch">{Math.round(state.pitch)}°</output>
                <input type="range" aria-label="Pitch" min={0} max={85} value={state.pitch} onChange={(event) => state.setPitch(Number(event.target.value))} />
            </label>
            <label className="check">
                <input type="checkbox" checked={terrain.enabled} onChange={(event) => state.setTerrain({ enabled: event.target.checked })} />
                Terreno
            </label>
            <label>
                Exageración <output>{terrain.exaggeration.toFixed(1)}×</output>
                <input
                    type="range"
                    aria-label="Exageración"
                    min={1}
                    max={4}
                    step={0.1}
                    value={terrain.exaggeration}
                    onChange={(event) => state.setTerrain({ exaggeration: Number(event.target.value) })}
                />
            </label>
            <label className="check">
                <input type="checkbox" checked={wms.visible} onChange={(event) => overlay.setVisible(event.target.checked)} />
                WMS
            </label>
            <label>
                Opacidad
                <input type="range" aria-label="Opacidad" min={0} max={1} step={0.05} value={wms.opacity} onChange={(event) => overlay.setOpacity(Number(event.target.value))} />
            </label>
            <label className="check">
                <input type="checkbox" checked={swipe} disabled={!state.active} onChange={(event) => onSwipe(event.target.checked)} />
                Cortina
            </label>
        </header>
    );
}
