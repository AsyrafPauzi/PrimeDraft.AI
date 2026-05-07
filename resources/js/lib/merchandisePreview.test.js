import { describe, expect, it } from 'vitest';
import { getMerchandisePreviewUrlForSide } from './merchandisePreview';

describe('getMerchandisePreviewUrlForSide', () => {
    it('returns distinct assets per apparel side', () => {
        expect(getMerchandisePreviewUrlForSide('T-Shirt', 'Front side')).toBe('/materials/tshirt-front.svg');
        expect(getMerchandisePreviewUrlForSide('T-Shirt', 'Back side')).toBe('/materials/tshirt-back.svg');
        expect(getMerchandisePreviewUrlForSide('Jersey', 'Sleeve left')).toBe('/materials/tshirt-sleeve-left.svg');
    });

    it('returns distinct assets per drinkware side', () => {
        expect(getMerchandisePreviewUrlForSide('Mug', 'Front')).toBe('/materials/mug-front.svg');
        expect(getMerchandisePreviewUrlForSide('Mug', 'Back')).toBe('/materials/mug-back.svg');
        expect(getMerchandisePreviewUrlForSide('Tumbler', 'Handle side')).toBe('/materials/mug-handle.svg');
    });

    it('returns distinct assets per headwear side', () => {
        expect(getMerchandisePreviewUrlForSide('Cap', 'Front panel')).toBe('/materials/cap-front.svg');
        expect(getMerchandisePreviewUrlForSide('Cap', 'Back panel')).toBe('/materials/cap-back.svg');
        expect(getMerchandisePreviewUrlForSide('Beanie', 'Left panel')).toBe('/materials/cap-left.svg');
    });

    it('uses flat template for single-face merchandise', () => {
        expect(getMerchandisePreviewUrlForSide('Sticker', 'Front')).toBe('/materials/flat-front.svg');
    });
});
