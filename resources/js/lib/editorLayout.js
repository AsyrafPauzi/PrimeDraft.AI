/** T‑shirt / apparel: four distinct print faces (legacy constant name kept for imports). */
export const APPAREL_SIDES = ['Front side', 'Back side', 'Sleeve left', 'Sleeve right'];

/** @deprecated Use {@link getSidesForMerchandise} — this is apparel-only. */
export const PRODUCT_SIDES = APPAREL_SIDES;

/** Cap, beanie, etc.: four panels around the crown. */
export const HEADWEAR_SIDES = ['Front panel', 'Left panel', 'Right panel', 'Back panel'];

/** Mug, tumbler, bottle: three common print views (not shirt sleeves). */
export const DRINKWARE_SIDES = ['Front', 'Back', 'Handle side'];

/** Stickers, posters, etc.: single printable face. */
export const FLAT_SIDES = ['Front'];

function normalizeMerchLabel(label) {
    return String(label || '')
        .trim()
        .toLowerCase();
}

function merchMatches(norm, fragments) {
    return fragments.some((f) => norm === f || norm.includes(f) || (f.length > 2 && f.includes(norm)));
}

/**
 * Printable sides for this merchandise type. Unknown / custom labels default to a single {@link FLAT_SIDES} canvas.
 * @param {string} merchandiseLabel
 * @returns {string[]}
 */
export function getSidesForMerchandise(merchandiseLabel) {
    const norm = normalizeMerchLabel(merchandiseLabel);
    if (!norm) {
        return [...FLAT_SIDES];
    }

    if (
        merchMatches(norm, ['t-shirt', 'polo shirt', 'polo', 'hoodie', 'jacket', 'jersey', 'tote', 'backpack', 'long sleeve'])
    ) {
        return [...APPAREL_SIDES];
    }

    if (merchMatches(norm, ['cap', 'beanie', 'keychain', 'lanyard'])) {
        return [...HEADWEAR_SIDES];
    }

    if (merchMatches(norm, ['mug', 'tumbler', 'water bottle', 'bottle'])) {
        return [...DRINKWARE_SIDES];
    }

    if (merchMatches(norm, ['sticker', 'poster', 'banner', 'notebook', 'phone case', 'phone', 'mouse pad', 'mouse'])) {
        return [...FLAT_SIDES];
    }

    return [...FLAT_SIDES];
}

/** Default center for CSS background-position (percentages). */
export function defaultGarmentBackgroundPosition() {
    return { x: 50, y: 50 };
}

/** @param {unknown} raw */
export function normalizeGarmentBackgroundPosition(raw) {
    const d = defaultGarmentBackgroundPosition();
    if (!raw || typeof raw !== 'object') {
        return { ...d };
    }
    const clamp = (n) => (Number.isFinite(n) ? Math.min(110, Math.max(-10, n)) : null);
    const x = clamp(/** @type {{ x?: unknown }} */ (raw).x);
    const y = clamp(/** @type {{ y?: unknown }} */ (raw).y);
    return { x: x ?? d.x, y: y ?? d.y };
}

export function createEmptyScratchLayout(merchandiseFallback = '') {
    const merch = typeof merchandiseFallback === 'string' && merchandiseFallback.trim() ? merchandiseFallback.trim() : null;
    const sidesList = getSidesForMerchandise(merch || '');
    return {
        version: 1,
        merchandise: merch,
        productBaseColor: '#ffffff',
        productGarmentBackgroundSrc: null,
        productGarmentBackgroundPresetKey: null,
        productGarmentBackgroundPosition: defaultGarmentBackgroundPosition(),
        sides: Object.fromEntries(sidesList.map((side) => [side, { layers: [], fabric: null }])),
    };
}

export function normalizeScratchLayout(raw, merchandiseFallback = '') {
    const pick = (layout) => {
        if (!layout || typeof layout !== 'object') return null;
        const m = layout.merchandise ?? layout.material;
        return typeof m === 'string' && m.trim() ? m.trim() : null;
    };

    const fallback = pick(raw) || (typeof merchandiseFallback === 'string' && merchandiseFallback.trim() ? merchandiseFallback.trim() : null);
    const base = createEmptyScratchLayout(fallback || '');

    if (!raw || typeof raw !== 'object') {
        return base;
    }

    const sides = {};
    for (const side of Object.keys(base.sides)) {
        const rawSide = raw.sides?.[side];
        const layers = Array.isArray(rawSide?.layers)
            ? rawSide.layers
                  .filter((layer) => layer && typeof layer === 'object' && typeof layer.type === 'string')
                  .map((layer) => ({
                      ...layer,
                      locked: Boolean(layer.locked),
                      hidden: Boolean(layer.hidden),
                      transform:
                          layer.transform && typeof layer.transform === 'object'
                              ? { ...defaultLayerTransform(), ...layer.transform }
                              : defaultLayerTransform(),
                  }))
            : [];
        const fabric = rawSide?.fabric && typeof rawSide.fabric === 'object' ? rawSide.fabric : null;
        sides[side] = fabric ? { layers, fabric } : { layers };
    }

    const merch = pick(raw) || base.merchandise;

    const bgSrc =
        typeof raw.productGarmentBackgroundSrc === 'string' && raw.productGarmentBackgroundSrc.trim()
            ? raw.productGarmentBackgroundSrc.trim()
            : null;
    const bgPreset =
        typeof raw.productGarmentBackgroundPresetKey === 'string' && raw.productGarmentBackgroundPresetKey.trim()
            ? raw.productGarmentBackgroundPresetKey.trim()
            : null;

    return {
        version: typeof raw.version === 'number' ? raw.version : 1,
        merchandise: merch,
        productBaseColor: typeof raw.productBaseColor === 'string' && raw.productBaseColor ? raw.productBaseColor : '#ffffff',
        productGarmentBackgroundSrc: bgSrc,
        productGarmentBackgroundPresetKey: bgSrc ? bgPreset : null,
        productGarmentBackgroundPosition: normalizeGarmentBackgroundPosition(raw.productGarmentBackgroundPosition),
        sides,
    };
}

export function nextLayerId() {
    return `layer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function cloneLayout(layout) {
    return structuredClone(layout);
}

/**
 * Sort layers ascending by zIndex for paint order (bottom→top).
 * @param {Array} layers
 */
export function sortLayers(layers) {
    return [...layers].sort((a, b) => {
        const za = typeof a.zIndex === 'number' ? a.zIndex : 0;
        const zb = typeof b.zIndex === 'number' ? b.zIndex : 0;
        if (za !== zb) return za - zb;
        return String(a.id).localeCompare(String(b.id));
    });
}

/** @returns {{ x: number, y: number, w: number, h: number, rotation: number }} */
export function defaultLayerTransform(x = 0.35, y = 0.35, w = 0.3, h = 0.22) {
    return { x, y, w, h: Math.max(h, 0.08), rotation: 0 };
}

/** @typedef {{ id?: string }} Layer */

function nextZ(layers) {
    if (!layers?.length) return 1;
    return Math.max(...layers.map((l) => (typeof l.zIndex === 'number' ? l.zIndex : 0))) + 1;
}

/**
 * @param {object} layout
 * @param {string} side
 * @param {object} layer
 */
function sideWithLayersPreservingFabric(prevSide, layers) {
    if (!prevSide || typeof prevSide !== 'object') {
        return { layers };
    }
    const fabric = prevSide.fabric && typeof prevSide.fabric === 'object' ? prevSide.fabric : null;
    return fabric ? { layers, fabric } : { layers };
}

export function addLayerToSide(layout, side, layer) {
    const next = cloneLayout(layout);
    const list = next.sides?.[side]?.layers ? [...next.sides[side].layers] : [];
    const id = layer.id || nextLayerId();
    const zIndex = typeof layer.zIndex === 'number' ? layer.zIndex : nextZ(list);
    list.push({ ...layer, id, zIndex });
    next.sides[side] = sideWithLayersPreservingFabric(next.sides?.[side], list);
    return next;
}

export function removeLayerFromSide(layout, side, layerId) {
    const next = cloneLayout(layout);
    if (!next.sides?.[side]) return next;
    const layers = next.sides[side].layers.filter((l) => l && l.id !== layerId);
    next.sides[side] = sideWithLayersPreservingFabric(next.sides[side], layers);
    return next;
}

export function updateLayerOnSide(layout, side, layerId, patch) {
    const next = cloneLayout(layout);
    if (!next.sides?.[side]) return next;
    const layers = next.sides[side].layers.map((l) => (l && l.id === layerId ? { ...l, ...patch } : l));
    next.sides[side] = sideWithLayersPreservingFabric(next.sides[side], layers);
    return next;
}

export function updateLayerTransformOnSide(layout, side, layerId, transform) {
    const next = cloneLayout(layout);
    if (!next.sides?.[side]) return next;
    const layers = next.sides[side].layers.map((l) => {
        if (!l || l.id !== layerId) return l;
        const prev = l.transform && typeof l.transform === 'object' ? l.transform : defaultLayerTransform();
        return { ...l, transform: { ...prev, ...transform } };
    });
    next.sides[side] = sideWithLayersPreservingFabric(next.sides[side], layers);
    return next;
}

/**
 * Re-stack layers for one side: `orderedIdsBottomToTop[0]` is bottom (painted first), last is top.
 * @param {object} layout
 * @param {string} side
 * @param {string[]} orderedIdsBottomToTop
 */
export function reorderLayersVisualOrder(layout, side, orderedIdsBottomToTop) {
    const next = cloneLayout(layout);
    const list = [...(next.sides?.[side]?.layers || [])];
    const map = new Map(list.map((l) => [l.id, { ...l }]));
    const seen = new Set();
    const rebuilt = [];
    for (const id of orderedIdsBottomToTop) {
        const l = map.get(id);
        if (l) {
            rebuilt.push(l);
            seen.add(id);
        }
    }
    for (const l of list) {
        if (!seen.has(l.id)) rebuilt.push({ ...l });
    }
    rebuilt.forEach((l, i) => {
        l.zIndex = i + 1;
    });
    next.sides[side] = sideWithLayersPreservingFabric(next.sides[side], rebuilt);
    return next;
}

export function moveLayerZIndex(layout, side, layerId, direction) {
    const sorted = sortLayers(layout.sides?.[side]?.layers || []);
    const idx = sorted.findIndex((l) => l.id === layerId);
    if (idx < 0) return layout;
    const swapWith = direction === 'up' ? idx + 1 : idx - 1;
    if (swapWith < 0 || swapWith >= sorted.length) return layout;
    const a = sorted[idx];
    const b = sorted[swapWith];
    const za = typeof a.zIndex === 'number' ? a.zIndex : 0;
    const zb = typeof b.zIndex === 'number' ? b.zIndex : 0;
    let next = updateLayerOnSide(layout, side, a.id, { zIndex: zb });
    next = updateLayerOnSide(next, side, b.id, { zIndex: za });
    return next;
}

/**
 * Merge editor layout into existing scratch JSON (preserves client_reference, etc.).
 * @param {Record<string, unknown>|null|undefined} existingScratch
 * @param {object} layout
 */
export function mergeScratchForSave(existingScratch, layout) {
    const base = existingScratch && typeof existingScratch === 'object' ? { ...existingScratch } : {};
    return {
        ...base,
        ...layout,
        version: typeof layout.version === 'number' ? layout.version : 1,
        sides: layout.sides,
        merchandise: layout.merchandise ?? base.merchandise ?? base.material ?? null,
        productBaseColor: layout.productBaseColor ?? '#ffffff',
        productGarmentBackgroundSrc:
            typeof layout.productGarmentBackgroundSrc === 'string' && layout.productGarmentBackgroundSrc.trim()
                ? layout.productGarmentBackgroundSrc.trim()
                : null,
        productGarmentBackgroundPresetKey:
            layout.productGarmentBackgroundSrc &&
            typeof layout.productGarmentBackgroundPresetKey === 'string' &&
            layout.productGarmentBackgroundPresetKey.trim()
                ? layout.productGarmentBackgroundPresetKey.trim()
                : null,
        productGarmentBackgroundPosition: normalizeGarmentBackgroundPosition(layout.productGarmentBackgroundPosition),
    };
}
