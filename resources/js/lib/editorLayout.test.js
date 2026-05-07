import { describe, expect, it } from 'vitest';
import {
    APPAREL_SIDES,
    DRINKWARE_SIDES,
    FLAT_SIDES,
    HEADWEAR_SIDES,
    createEmptyScratchLayout,
    getSidesForMerchandise,
    normalizeScratchLayout,
} from './editorLayout';

describe('getSidesForMerchandise', () => {
    it('returns four apparel panels for T‑shirt and jersey', () => {
        expect(getSidesForMerchandise('T-Shirt')).toEqual(APPAREL_SIDES);
        expect(getSidesForMerchandise('Jersey')).toEqual(APPAREL_SIDES);
    });

    it('returns four headwear panels for cap and beanie', () => {
        expect(getSidesForMerchandise('Cap')).toEqual(HEADWEAR_SIDES);
        expect(getSidesForMerchandise('Beanie')).toEqual(HEADWEAR_SIDES);
    });

    it('returns three drinkware views for mug and tumbler', () => {
        expect(getSidesForMerchandise('Mug')).toEqual(DRINKWARE_SIDES);
        expect(getSidesForMerchandise('Water Bottle')).toEqual(DRINKWARE_SIDES);
    });

    it('returns a single front for stickers and unknown custom labels', () => {
        expect(getSidesForMerchandise('Sticker')).toEqual(FLAT_SIDES);
        expect(getSidesForMerchandise('Custom plush toy')).toEqual(FLAT_SIDES);
    });

    it('normalizeScratchLayout uses merchandise-specific side keys', () => {
        const mug = normalizeScratchLayout({ version: 1, merchandise: 'Mug' }, 'Mug');
        expect(Object.keys(mug.sides)).toEqual(DRINKWARE_SIDES);
        const shirt = normalizeScratchLayout({ version: 1, merchandise: 'T-Shirt' }, 'T-Shirt');
        expect(Object.keys(shirt.sides)).toEqual(APPAREL_SIDES);
    });

    it('createEmptyScratchLayout matches merchandise template', () => {
        const cap = createEmptyScratchLayout('Cap');
        expect(Object.keys(cap.sides)).toEqual(HEADWEAR_SIDES);
    });
});
