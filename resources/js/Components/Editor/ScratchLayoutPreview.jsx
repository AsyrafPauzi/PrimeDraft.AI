import React, { useEffect, useMemo, useState } from 'react';
import { getMerchandiseColorMaskUrlForSide, getMerchandisePreviewUrlForSide, getScratchMerchandise } from '../../lib/merchandisePreview';
import { cssUrlValue } from '../../lib/cssSafeUrl';
import { getSidesForMerchandise, normalizeScratchLayout, sortLayers } from '../../lib/editorLayout';

/** Matches CanvasWorkspace layer region (full garment box per side). */
const FULL_BLEED_INSET = { top: '0%', left: '0%', right: '0%', bottom: '0%' };
const DEFAULT_PRINT_INSET = FULL_BLEED_INSET;
const PRINT_INSET_BY_SIDE = {
    'Front side': FULL_BLEED_INSET,
    'Back side': FULL_BLEED_INSET,
    'Sleeve left': FULL_BLEED_INSET,
    'Sleeve right': FULL_BLEED_INSET,
    Front: FULL_BLEED_INSET,
    Back: FULL_BLEED_INSET,
    'Handle side': FULL_BLEED_INSET,
    'Front panel': FULL_BLEED_INSET,
    'Back panel': FULL_BLEED_INSET,
    'Left panel': FULL_BLEED_INSET,
    'Right panel': FULL_BLEED_INSET,
};

function sideLayerCount(layout, side) {
    return (layout?.sides?.[side]?.layers ?? []).length;
}

/**
 * Read-only garment + layers (same geometry as the editor). For project dialogs, dashboards, etc.
 */
export function ScratchLayoutPreview({ scratchLayout, merchandiseFallback = '', className = '' }) {
    const layout = useMemo(
        () => normalizeScratchLayout(scratchLayout, merchandiseFallback || getScratchMerchandise(scratchLayout)),
        [scratchLayout, merchandiseFallback]
    );

    const sides = useMemo(
        () => getSidesForMerchandise(layout.merchandise || merchandiseFallback || ''),
        [layout.merchandise, merchandiseFallback]
    );

    const [activeSide, setActiveSide] = useState(sides[0] || 'Front');

    const merchandise = layout.merchandise || '';
    const svgUrl = getMerchandisePreviewUrlForSide(String(merchandise).trim(), activeSide);
    const maskUrl = getMerchandiseColorMaskUrlForSide(String(merchandise).trim(), activeSide);
    const layers = sortLayers(layout.sides?.[activeSide]?.layers ?? []);
    const totalLayers = useMemo(() => sides.reduce((n, s) => n + sideLayerCount(layout, s), 0), [layout, sides]);

    useEffect(() => {
        setActiveSide((s) => (sides.includes(s) ? s : sides[0] || 'Front'));
    }, [sides]);

    if (!svgUrl) {
        return (
            <div
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400 ${className}`}
            >
                <p>No product preview image for this merchandise type.</p>
                {totalLayers > 0 ? <p className="mt-1">Design has {totalLayers} layer(s) — open the editor to see them on the canvas.</p> : null}
            </div>
        );
    }

    const shortSideLabel = (side) => side.replace(' side', '').replace('Sleeve ', '');

    const bgSrc = typeof layout.productGarmentBackgroundSrc === 'string' ? layout.productGarmentBackgroundSrc.trim() : '';
    const hasGarmentBg = Boolean(bgSrc);
    const tintHex = String(layout.productBaseColor || '#ffffff').trim().toLowerCase();
    const shadeIsWhite = tintHex === '#ffffff' || tintHex === '#fff';
    const tintOpacity = shadeIsWhite ? 0 : !hasGarmentBg ? 0.75 : 0.24;

    return (
        <div className={className}>
            <div className="mb-2 flex flex-wrap gap-1">
                {sides.map((side) => {
                    const n = sideLayerCount(layout, side);
                    return (
                        <button
                            key={side}
                            type="button"
                            onClick={() => setActiveSide(side)}
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                                activeSide === side
                                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                                    : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            {shortSideLabel(side)}
                            {n > 0 ? ` · ${n}` : ''}
                        </button>
                    );
                })}
            </div>

            <div className="relative mx-auto h-[min(260px,42vh)] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-[#8f8f8f] dark:border-slate-700 dark:bg-[#18181b]">
                <div className="absolute left-1/2 top-1 z-0 -translate-x-1/2 scale-[0.52] sm:scale-[0.58]">
                    <div className="relative inline-block select-none">
                        <img
                            src={svgUrl}
                            alt={`${merchandise || 'Product'} preview`}
                            className="relative z-[6] block h-[360px] w-auto max-w-[min(100vw,480px)] drop-shadow-xl"
                            draggable={false}
                        />
                        {hasGarmentBg && maskUrl ? (
                            <div className="pointer-events-none absolute inset-0 z-[8] rounded-sm [opacity:0.78]" aria-hidden>
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: cssUrlValue(bgSrc),
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: '185% 185%',
                                        backgroundPosition: `${layout.productGarmentBackgroundPosition?.x ?? 50}% ${layout.productGarmentBackgroundPosition?.y ?? 50}%`,
                                        mixBlendMode: 'multiply',
                                        WebkitMaskImage: cssUrlValue(maskUrl),
                                        maskImage: cssUrlValue(maskUrl),
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskRepeat: 'no-repeat',
                                        WebkitMaskPosition: 'center',
                                        maskPosition: 'center',
                                        WebkitMaskSize: 'contain',
                                        maskSize: 'contain',
                                    }}
                                />
                            </div>
                        ) : null}
                        {hasGarmentBg && !maskUrl ? (
                            <div
                                className="pointer-events-none absolute inset-[10%] z-[9] rounded-[min(18%,48px)]"
                                aria-hidden
                                style={{
                                    backgroundImage: cssUrlValue(bgSrc),
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '190% 190%',
                                    backgroundPosition: `${layout.productGarmentBackgroundPosition?.x ?? 50}% ${layout.productGarmentBackgroundPosition?.y ?? 50}%`,
                                    mixBlendMode: 'multiply',
                                }}
                            />
                        ) : null}
                        {maskUrl ? (
                            <div
                                className="pointer-events-none absolute inset-0 z-[12] rounded-sm"
                                style={{
                                    backgroundColor: layout.productBaseColor || '#ffffff',
                                    mixBlendMode: 'multiply',
                                    opacity: tintOpacity,
                                    WebkitMaskImage: cssUrlValue(maskUrl),
                                    maskImage: cssUrlValue(maskUrl),
                                    WebkitMaskRepeat: 'no-repeat',
                                    maskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center',
                                    maskPosition: 'center',
                                    WebkitMaskSize: 'contain',
                                    maskSize: 'contain',
                                }}
                                aria-hidden
                            />
                        ) : null}
                        {hasGarmentBg ? (
                            <img
                                src={svgUrl}
                                alt=""
                                draggable={false}
                                className="pointer-events-none absolute left-1/2 top-0 z-[14] block h-[360px] w-auto max-w-[min(100vw,480px)] -translate-x-1/2"
                                style={{
                                    mixBlendMode: 'darken',
                                    opacity: maskUrl ? 0.42 : 0.36,
                                    filter: 'contrast(1.15) saturate(0.94)',
                                }}
                                aria-hidden
                            />
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 z-[22]">
                            <div
                                className="pointer-events-none absolute flex items-center justify-center"
                                style={PRINT_INSET_BY_SIDE[activeSide] || DEFAULT_PRINT_INSET}
                            >
                                <div className="relative h-full w-full">
                                    {layers.map((layer) => {
                                        const t = layer.transform || { x: 0.35, y: 0.35, w: 0.3, h: 0.22, rotation: 0 };
                                        const baseStyle = {
                                            position: 'absolute',
                                            left: `${t.x * 100}%`,
                                            top: `${t.y * 100}%`,
                                            width: `${t.w * 100}%`,
                                            height: `${t.h * 100}%`,
                                            transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                                            transformOrigin: 'center center',
                                        };
                                        return (
                                            <div key={layer.id} className="box-border" style={baseStyle}>
                                                {layer.type === 'image' || layer.type === 'graphicRef' ? (
                                                    <img
                                                        src={layer.props?.src || ''}
                                                        alt=""
                                                        className="h-full w-full object-contain"
                                                        draggable={false}
                                                    />
                                                ) : null}
                                                {layer.type === 'text' ? (
                                                    <div
                                                        className="flex h-full w-full items-center justify-center overflow-hidden text-center font-semibold leading-tight"
                                                        style={{
                                                            fontFamily: layer.props?.fontFamily || 'system-ui, sans-serif',
                                                            color: layer.props?.color || '#111827',
                                                            fontSize: `${layer.props?.fontSizePx ?? 16}px`,
                                                        }}
                                                    >
                                                        {layer.props?.text || 'Text'}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {totalLayers === 0 ? (
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    No artwork on the canvas yet — open the editor to add images or text.
                </p>
            ) : null}
        </div>
    );
}
