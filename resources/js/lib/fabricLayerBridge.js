import { defaultLayerTransform, nextLayerId } from './editorLayout';

/** @param {unknown} o */
export function getFabricPdId(o) {
    if (!o || typeof o !== 'object') return null;
    const obj = /** @type {{ pdId?: string; get?: (k: string) => unknown }} */ (o);
    if (typeof obj.pdId === 'string' && obj.pdId) return obj.pdId;
    const g = obj.get?.('pdId');
    return typeof g === 'string' && g ? g : null;
}

/** Ensure every canvas object has a stable `pdId` for the Layers panel. */
/** Normalize Fabric fontWeight for UI that expects `'400'` / `'700'`. */
export function fabricFontWeightToPanel(fw) {
    if (fw === 'bold' || fw === 700 || fw === '700') return '700';
    const n = typeof fw === 'number' ? fw : parseInt(String(fw || ''), 10);
    if (Number.isFinite(n) && n >= 600) return '700';
    return '400';
}

export function ensurePdIdsOnCanvasObjects(objects) {
    if (!Array.isArray(objects)) return;
    for (const o of objects) {
        if (!o || typeof o.set !== 'function') continue;
        if (!getFabricPdId(o)) {
            o.set('pdId', nextLayerId());
        }
    }
}

/**
 * @param {unknown} raw
 * @param {number} cw
 * @param {number} ch
 */
function legacyTransformFromFabricObject(raw, cw, ch) {
    if (!raw || cw <= 0 || ch <= 0) return defaultLayerTransform();
    if (typeof /** @type {{ setCoords?: () => void }} */ (raw).setCoords === 'function') {
        /** @type {{ setCoords: () => void }} */ (raw).setCoords();
    }
    const getBox = /** @type {{ getBoundingRect?: () => { left: number; top: number; width: number; height: number } }} */ (raw).getBoundingRect;
    const box = typeof getBox === 'function' ? getBox.call(raw) : null;
    if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0) {
        return defaultLayerTransform();
    }
    const angle = typeof /** @type {{ angle?: number }} */ (raw).angle === 'number' ? raw.angle : 0;
    return {
        x: Math.max(0, Math.min(1, box.left / cw)),
        y: Math.max(0, Math.min(1, box.top / ch)),
        w: Math.max(0.02, Math.min(1, box.width / cw)),
        h: Math.max(0.02, Math.min(1, box.height / ch)),
        rotation: angle,
    };
}

/**
 * Map live Fabric objects → legacy layer list for {@link ToolContentPanel} and {@link ScratchLayoutPreview}.
 * Transforms are normalized 0–1 vs **canvas** width/height so HTML previews match the Fabric artboard.
 * @param {unknown[]} objects from `canvas.getObjects()`
 * @param {number} [canvasWidth] from `canvas.getWidth()`
 * @param {number} [canvasHeight] from `canvas.getHeight()`
 */
export function fabricObjectsToLegacyLayers(objects, canvasWidth = 440, canvasHeight = 520) {
    if (!Array.isArray(objects)) return [];
    const cw = Number(canvasWidth) || 440;
    const ch = Number(canvasHeight) || 520;
    return objects.map((raw, i) => {
        const o = /** @type {Record<string, unknown> & { type?: string; text?: string; fontFamily?: string; fontSize?: number; fill?: unknown; src?: string; selectable?: boolean; evented?: boolean; visible?: boolean; underline?: boolean; linethrough?: boolean; fontWeight?: string | number; fontStyle?: string }} */ (
            raw
        );
        const id = getFabricPdId(raw) || `tmp_layer_${i}`;
        const typeStr = String(o.type || '').toLowerCase();
        const isText = typeStr === 'text' || typeStr === 'i-text' || typeStr === 'itext' || typeStr === 'textbox';
        const locked = o.selectable === false || o.evented === false;
        const hidden = o.visible === false;
        const fill = typeof o.fill === 'string' ? o.fill : '#111827';
        const transform = legacyTransformFromFabricObject(raw, cw, ch);
        if (isText) {
            let textDecoration = 'none';
            if (o.underline) textDecoration = 'underline';
            else if (o.linethrough) textDecoration = 'line-through';
            return {
                id,
                type: 'text',
                zIndex: i + 1,
                locked,
                hidden,
                transform,
                props: {
                    text: String(o.text ?? 'Text'),
                    fontFamily: typeof o.fontFamily === 'string' ? o.fontFamily : 'Inter',
                    fontSizePx: typeof o.fontSize === 'number' ? o.fontSize : 22,
                    color: fill,
                    fontWeight: fabricFontWeightToPanel(o.fontWeight),
                    fontStyle: typeof o.fontStyle === 'string' ? o.fontStyle : 'normal',
                    textDecoration,
                },
            };
        }
        const getSrc =
            typeof raw?.getSrc === 'function'
                ? () => raw.getSrc()
                : typeof raw?.get === 'function'
                  ? () => raw.get('src')
                  : null;
        const src = typeof o.src === 'string' ? o.src : getSrc ? String(getSrc() || '') : '';
        return {
            id,
            type: 'image',
            zIndex: i + 1,
            locked,
            hidden,
            transform,
            props: { src },
        };
    });
}
