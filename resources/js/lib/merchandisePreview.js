import { getSidesForMerchandise } from './editorLayout';

/** Quick-pick catalogue (canonical labels shown in UI). */
export const MERCHANDISE_OPTIONS = [
    'T-Shirt',
    'Polo Shirt',
    'Hoodie',
    'Jacket',
    'Jersey',
    'Cap',
    'Beanie',
    'Mug',
    'Tumbler',
    'Water Bottle',
    'Tote Bag',
    'Backpack',
    'Sticker',
    'Poster',
    'Banner',
    'Notebook',
    'Phone Case',
    'Mouse Pad',
    'Keychain',
    'Lanyard',
];

/** Map normalized label fragments to blank template assets (same URLs as `/public/materials/*`). */
const MERCHANDISE_PREVIEW_RELATIVE = {
    't-shirt': '/materials/tshirt-front.svg',
    'polo shirt': '/materials/tshirt-front.svg',
    hoodie: '/materials/tshirt-front.svg',
    jacket: '/materials/tshirt-front.svg',
    jersey: '/materials/tshirt-front.svg',
    tote: '/materials/tshirt-front.svg',
    backpack: '/materials/tshirt-front.svg',

    mug: '/materials/mug-front.svg',
    tumbler: '/materials/mug-front.svg',
    'water bottle': '/materials/mug-front.svg',
    sticker: '/materials/flat-front.svg',
    poster: '/materials/flat-front.svg',
    banner: '/materials/flat-front.svg',
    notebook: '/materials/flat-front.svg',
    phone: '/materials/flat-front.svg',
    mouse: '/materials/flat-front.svg',

    cap: '/materials/cap-front.svg',
    beanie: '/materials/cap-front.svg',
    keychain: '/materials/cap-front.svg',
    lanyard: '/materials/cap-front.svg',
};

/** Per-side blanks for apparel (must match {@link APPAREL_SIDES} keys in editorLayout). */
const APPAREL_SIDE_ASSETS = {
    'Front side': '/materials/tshirt-front.svg',
    'Back side': '/materials/tshirt-back.svg',
    'Sleeve left': '/materials/tshirt-sleeve-left.svg',
    'Sleeve right': '/materials/tshirt-sleeve-right.svg',
};

/** Per-side blanks for drinkware (must match {@link DRINKWARE_SIDES}). */
const DRINKWARE_SIDE_ASSETS = {
    Front: '/materials/mug-front.svg',
    Back: '/materials/mug-back.svg',
    'Handle side': '/materials/mug-handle.svg',
};

/** Per-side blanks for headwear (must match {@link HEADWEAR_SIDES}). */
const HEADWEAR_SIDE_ASSETS = {
    'Front panel': '/materials/cap-front.svg',
    'Left panel': '/materials/cap-left.svg',
    'Right panel': '/materials/cap-right.svg',
    'Back panel': '/materials/cap-back.svg',
};

const FLAT_FRONT_ASSET = '/materials/flat-front.svg';

/**
 * Blank template for a specific print side (each tab in the editor can use a different asset).
 * @param {string} label Merchandise label (same as catalogue / scratch_layout.merchandise)
 * @param {string} [sideKey] Active side label, e.g. "Front side", "Handle side"
 * @returns {string|null}
 */
export function getMerchandisePreviewUrlForSide(label, sideKey) {
    const side = String(sideKey || 'Front').trim();
    const sides = getSidesForMerchandise(label);

    // Legacy / partial saves may omit `merchandise` while the editor still uses apparel side keys (e.g. "Front side").
    if (APPAREL_SIDE_ASSETS[side] && !String(label || '').trim()) {
        return APPAREL_SIDE_ASSETS[side] || APPAREL_SIDE_ASSETS['Front side'];
    }

    if (sides.length === 1) {
        return FLAT_FRONT_ASSET;
    }

    if (sides.includes('Handle side')) {
        return DRINKWARE_SIDE_ASSETS[side] || DRINKWARE_SIDE_ASSETS.Front;
    }

    if (sides.includes('Front panel')) {
        return HEADWEAR_SIDE_ASSETS[side] || HEADWEAR_SIDE_ASSETS['Front panel'];
    }

    if (sides.includes('Front side')) {
        return APPAREL_SIDE_ASSETS[side] || APPAREL_SIDE_ASSETS['Front side'];
    }

    return getMerchandisePreviewUrl(label) || FLAT_FRONT_ASSET;
}

/** Apparel “3D-style” mockup (full garment); print area alignment is tuned for front view. */
const APPAREL_MOCKUP_BY_SIDE = {
    'Front side': '/materials/tshirt-blank.svg',
    'Back side': '/materials/tshirt-back.svg',
    'Sleeve left': '/materials/tshirt-sleeve-left.svg',
    'Sleeve right': '/materials/tshirt-sleeve-right.svg',
};

/**
 * Mockup-style garment image for preview mode (falls back to flat template when no mockup asset).
 * @param {string} label Merchandise label
 * @param {string} [sideKey] Active side
 * @returns {string|null}
 */
export function getMerchandiseMockupUrlForSide(label, sideKey) {
    const side = String(sideKey || 'Front side').trim();
    const sides = getSidesForMerchandise(label);

    if (APPAREL_SIDE_ASSETS[side] && !String(label || '').trim()) {
        return APPAREL_MOCKUP_BY_SIDE[side] || APPAREL_MOCKUP_BY_SIDE['Front side'] || APPAREL_SIDE_ASSETS[side];
    }

    if (sides.includes('Front side')) {
        return APPAREL_MOCKUP_BY_SIDE[side] || APPAREL_MOCKUP_BY_SIDE['Front side'] || getMerchandisePreviewUrlForSide(label, sideKey);
    }

    return getMerchandisePreviewUrlForSide(label, sideKey);
}

/**
 * Alpha mask used for product color tint. Currently enabled for apparel because
 * those SVGs are transparent silhouettes; returning null avoids tinting whole
 * mug/cap backgrounds until those masks are split out too.
 */
export function getMerchandiseColorMaskUrlForSide(label, sideKey) {
    const side = String(sideKey || 'Front side').trim();
    const sides = getSidesForMerchandise(label);
    if (sides.includes('Front side')) {
        return APPAREL_SIDE_ASSETS[side] || APPAREL_SIDE_ASSETS['Front side'];
    }
    if (APPAREL_SIDE_ASSETS[side] && !String(label || '').trim()) {
        return APPAREL_SIDE_ASSETS[side] || APPAREL_SIDE_ASSETS['Front side'];
    }
    return null;
}

/**
 * Resolved scratch layout merchandise (new key) or legacy `material`.
 * @param {Record<string, unknown>|null|undefined} scratch
 */
export function getScratchMerchandise(scratch) {
    if (!scratch || typeof scratch !== 'object') {
        return '';
    }
    const m = scratch.merchandise ?? scratch.material;
    return typeof m === 'string' ? m.trim() : '';
}

/**
 * Blank template image URL for a merchandise label or custom typed value.
 */
export function getMerchandisePreviewUrl(label) {
    const normalized = String(label || '')
        .trim()
        .toLowerCase();

    const directKeys = MERCHANDISE_PREVIEW_RELATIVE;
    if (directKeys[normalized]) {
        return directKeys[normalized];
    }

    for (const [key, path] of Object.entries(directKeys)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return path;
        }
    }

    if (normalized.length > 0) {
        const compact = normalized.replace(/[^a-z0-9]+/g, '');
        const compactEntries = Object.entries(directKeys);
        const hit = compactEntries.find(([fragment]) => compact.includes(fragment.replace(/[^a-z0-9]/g, '')));
        if (hit) return hit[1];
    }

    return null;
}
