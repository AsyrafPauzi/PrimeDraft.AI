import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getMerchandiseColorMaskUrlForSide, getMerchandisePreviewUrlForSide } from '../../lib/merchandisePreview';
import { cssUrlValue } from '../../lib/cssSafeUrl';
import { sortLayers } from '../../lib/editorLayout';

/**
 * Layer editor region (inset inside the garment bounding box). Uses full bleed per side so
 * artwork can sit anywhere on front, back, sleeves, or other merchandise views.
 */
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

function getPrintInsetForSide(side) {
    return PRINT_INSET_BY_SIDE[side] || DEFAULT_PRINT_INSET;
}

export function CanvasWorkspace({
    merchandise = '',
    material = '',
    side = 'Front side',
    viewMode = 'edit',
    zoom = 100,
    productBaseColor = '#ffffff',
    productGarmentBackgroundSrc = null,
    productGarmentBackgroundPosition = { x: 50, y: 50 },
    onGarmentBackgroundPositionChange,
    adjustGarmentBackground = false,
    layers = [],
    selectedLayerId = null,
    onSelectLayer,
    onUpdateLayerTransform,
    onAddImageFromSrc,
    textEditingLayerId = null,
    onTextEditingLayerChange,
    onUpdateTextLayer,
    interactionMode = 'default',
    panOffset = { x: 0, y: 0 },
    onPanOffsetChange,
}) {
    const label = String(merchandise || material || '').trim();
    const svgUrl = getMerchandisePreviewUrlForSide(label, side);
    const maskUrl = getMerchandiseColorMaskUrlForSide(label, side);
    const printInset = getPrintInsetForSide(side);
    const overlayRef = useRef(null);
    const garmentRef = useRef(null);

    const [dragging, setDragging] = useState(null);
    /** @type {{ id: string; mode: 'drag' | 'resize'; startFracX: number; startFracY: number; startTransform: object } | null} */

    const sorted = sortLayers(layers).filter((layer) => !layer?.hidden);
    const editable = viewMode === 'edit' && interactionMode === 'default' && !adjustGarmentBackground;

    const hasGarmentBg = Boolean(productGarmentBackgroundSrc?.trim?.());
    /** Treat #fff and #ffffff as white (avoid silent fallback from color picker). */
    const hexLooksWhite = () => {
        const c = String(productBaseColor || '#ffffff').trim().toLowerCase();
        return c === '#ffffff' || c === '#fff';
    };

    const tintOpacityWhite = () => {
        if (hexLooksWhite()) return 0;
        if (!hasGarmentBg) return 0.75;
        return 0.24;
    };
    const toFraction = useCallback((clientX, clientY) => {
        const el = overlayRef.current;
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        const x = (clientX - r.left) / Math.max(r.width, 1);
        const y = (clientY - r.top) / Math.max(r.height, 1);
        return { x, y };
    }, []);

    useEffect(() => {
        if (!dragging) return undefined;

        function onMove(ev) {
            const t = dragging.startTransform;
            if (dragging.mode === 'drag') {
                const cur = toFraction(ev.clientX, ev.clientY);
                const nx = cur.x - dragging.startFracX;
                const ny = cur.y - dragging.startFracY;
                onUpdateLayerTransform?.(dragging.id, {
                    x: Math.min(1 - t.w, Math.max(0, nx)),
                    y: Math.min(1 - t.h, Math.max(0, ny)),
                });
            } else if (dragging.mode === 'resize') {
                const cur = toFraction(ev.clientX, ev.clientY);
                const nx = Math.min(1 - t.x, Math.max(0.05, cur.x - t.x));
                const ny = Math.min(1 - t.y, Math.max(0.05, cur.y - t.y));
                onUpdateLayerTransform?.(dragging.id, { w: nx, h: ny });
            }
        }

        function onUp() {
            setDragging(null);
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging, onUpdateLayerTransform, toFraction]);

    function handleOverlayMouseDown(event) {
        if (!editable) return;
        if (event.target === overlayRef.current) {
            onSelectLayer?.(null);
        }
    }

    function startDragLayer(event, layer) {
        if (!editable) return;
        if (layer?.locked) return;
        if (layer?.type === 'text' && textEditingLayerId === layer.id) return;
        event.stopPropagation();
        onSelectLayer?.(layer.id);
        const t = layer.transform || { x: 0.35, y: 0.35, w: 0.3, h: 0.22, rotation: 0 };
        const frac = toFraction(event.clientX, event.clientY);
        setDragging({
            id: layer.id,
            mode: 'drag',
            startFracX: frac.x - t.x,
            startFracY: frac.y - t.y,
            startTransform: { ...t },
        });
    }

    function startResize(event, layer) {
        if (!editable) return;
        if (layer?.locked) return;
        event.stopPropagation();
        const t = layer.transform || { x: 0.35, y: 0.35, w: 0.3, h: 0.22, rotation: 0 };
        setDragging({
            id: layer.id,
            mode: 'resize',
            startFracX: 0,
            startFracY: 0,
            startTransform: { ...t },
        });
    }

    function handleDragOver(event) {
        if (!editable) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }

    function handleDrop(event) {
        if (!editable) return;
        event.preventDefault();
        const url = event.dataTransfer.getData('application/x-primedraft-src') || event.dataTransfer.getData('text/uri-list');
        if (url) {
            onAddImageFromSrc?.(url.trim());
            return;
        }
        const files = event.dataTransfer.files;
        if (files?.length) {
            const f = files[0];
            if (f.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        onAddImageFromSrc?.(reader.result);
                    }
                };
                reader.readAsDataURL(f);
            }
        }
    }

    const [panState, setPanState] = useState(null);
    const [bgDrag, setBgDrag] = useState(null);

    const bgPos = productGarmentBackgroundPosition && typeof productGarmentBackgroundPosition === 'object' ? productGarmentBackgroundPosition : { x: 50, y: 50 };
    const [bgPreviewPos, setBgPreviewPos] = useState(null);

    useEffect(() => {
        setBgPreviewPos(null);
    }, [productGarmentBackgroundSrc, bgPos.x, bgPos.y]);

    const displayBgPos = bgPreviewPos ?? bgPos;

    useEffect(() => {
        if (!bgDrag || !adjustGarmentBackground) return undefined;
        let lastCommitted = { x: bgDrag.originX, y: bgDrag.originY };
        function move(ev) {
            const rect = garmentRef.current?.getBoundingClientRect();
            if (!rect?.width || !rect?.height) return;
            const k = 1.35;
            const nx = bgDrag.originX + ((ev.clientX - bgDrag.startX) / rect.width) * 100 * k;
            const ny = bgDrag.originY + ((ev.clientY - bgDrag.startY) / rect.height) * 100 * k;
            lastCommitted = {
                x: Math.min(110, Math.max(-10, nx)),
                y: Math.min(110, Math.max(-10, ny)),
            };
            setBgPreviewPos(lastCommitted);
        }
        function up() {
            if (bgDrag && onGarmentBackgroundPositionChange) {
                onGarmentBackgroundPositionChange(lastCommitted);
            }
            setBgDrag(null);
            setBgPreviewPos(null);
        }
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [bgDrag, adjustGarmentBackground, onGarmentBackgroundPositionChange]);

    function handleGarmentBgAdjustMouseDown(event) {
        if (!adjustGarmentBackground || !productGarmentBackgroundSrc) return;
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        setBgDrag({
            startX: event.clientX,
            startY: event.clientY,
            originX: bgPos.x,
            originY: bgPos.y,
        });
    }

    useEffect(() => {
        if (!panState) return undefined;
        function move(ev) {
            onPanOffsetChange?.({
                x: panState.originX + (ev.clientX - panState.startX),
                y: panState.originY + (ev.clientY - panState.startY),
            });
        }
        function up() {
            setPanState(null);
        }
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [panState, onPanOffsetChange]);

    function handleGarmentPanDown(event) {
        if (interactionMode !== 'pan' || viewMode !== 'edit') return;
        if (event.button !== 0) return;
        event.preventDefault();
        setPanState({
            startX: event.clientX,
            startY: event.clientY,
            originX: panOffset.x,
            originY: panOffset.y,
        });
    }

    return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
            <div
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                    transition: dragging || panState ? 'none' : 'transform 0.15s ease',
                    transformOrigin: 'center center',
                }}
            >
                {svgUrl ? (
                    <div className="relative inline-block select-none" ref={garmentRef}>
                        {/* Base garment first; tint & texture stacked above use multiply so they affect visible pixels */}
                        <img
                            src={svgUrl}
                            alt={`${label || 'Merchandise'} blank canvas – ${side}`}
                            className={`relative z-[6] block h-[480px] w-auto max-w-[min(100vw,560px)] drop-shadow-xl ${interactionMode === 'pan' && !adjustGarmentBackground ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            draggable={false}
                            onMouseDown={adjustGarmentBackground ? undefined : handleGarmentPanDown}
                        />
                        {hasGarmentBg && maskUrl ? (
                            <div className="pointer-events-none absolute inset-0 z-[8] rounded-sm [opacity:0.78]" aria-hidden>
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: cssUrlValue(productGarmentBackgroundSrc),
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: '185% 185%',
                                        backgroundPosition: `${displayBgPos.x}% ${displayBgPos.y}%`,
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
                                    backgroundImage: cssUrlValue(productGarmentBackgroundSrc),
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '190% 190%',
                                    backgroundPosition: `${displayBgPos.x}% ${displayBgPos.y}%`,
                                    mixBlendMode: 'multiply',
                                }}
                            />
                        ) : null}
                        {maskUrl ? (
                            <div
                                className="pointer-events-none absolute inset-0 z-[12] rounded-sm"
                                style={{
                                    backgroundColor: productBaseColor,
                                    mixBlendMode: 'multiply',
                                    opacity: tintOpacityWhite(),
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
                                className="pointer-events-none absolute left-1/2 top-0 z-[14] block h-[480px] w-auto max-w-[min(100vw,560px)] -translate-x-1/2"
                                style={{
                                    mixBlendMode: 'darken',
                                    opacity: maskUrl ? 0.42 : 0.36,
                                    filter: 'contrast(1.15) saturate(0.94)',
                                }}
                                aria-hidden
                            />
                        ) : null}
                        <div className={`absolute inset-0 z-[22] ${adjustGarmentBackground ? 'pointer-events-none' : ''}`}>
                            <div
                                ref={overlayRef}
                                className={`absolute flex items-center justify-center ${editable ? 'pointer-events-auto' : 'pointer-events-none'}`}
                                style={printInset}
                                onMouseDown={handleOverlayMouseDown}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                <div className="relative h-full w-full">
                                    {sorted.map((layer) => {
                                        const t = layer.transform || { x: 0.35, y: 0.35, w: 0.3, h: 0.22, rotation: 0 };
                                        const isSel = selectedLayerId === layer.id;
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
                                            <div
                                                key={layer.id}
                                                className={`box-border ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                                    isSel ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-cyan-400' : ''
                                                }`}
                                                style={baseStyle}
                                                onMouseDown={(e) => startDragLayer(e, layer)}
                                            >
                                                {layer.type === 'image' || layer.type === 'graphicRef' ? (
                                                    <img
                                                        src={layer.props?.src || ''}
                                                        alt=""
                                                        className="h-full w-full object-contain"
                                                        draggable={false}
                                                    />
                                                ) : null}
                                                {layer.type === 'text' ? (
                                                    textEditingLayerId === layer.id ? (
                                                        <div
                                                            key="inline-text-edit"
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            role="textbox"
                                                            aria-multiline="true"
                                                            autoFocus
                                                            className="flex h-full w-full cursor-text items-center justify-center overflow-auto text-center leading-tight outline-none ring-2 ring-indigo-500/90 dark:ring-cyan-400/90"
                                                            style={{
                                                                fontFamily: layer.props?.fontFamily || 'system-ui, sans-serif',
                                                                color: layer.props?.color || '#111827',
                                                                fontSize: `${layer.props?.fontSizePx ?? 16}px`,
                                                                fontWeight: layer.props?.fontWeight || '600',
                                                                fontStyle: layer.props?.fontStyle || 'normal',
                                                                textDecoration: layer.props?.textDecoration || 'none',
                                                            }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Escape') {
                                                                    e.preventDefault();
                                                                    e.currentTarget.blur();
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const raw = e.currentTarget.innerText ?? '';
                                                                const next = raw.replace(/\u00a0/g, ' ').trim() || ' ';
                                                                onUpdateTextLayer?.(layer.id, { text: next });
                                                                onTextEditingLayerChange?.(null);
                                                            }}
                                                        >
                                                            {layer.props?.text || 'Text'}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="flex h-full w-full cursor-pointer items-center justify-center overflow-hidden text-center leading-tight"
                                                            style={{
                                                                fontFamily: layer.props?.fontFamily || 'system-ui, sans-serif',
                                                                color: layer.props?.color || '#111827',
                                                                fontSize: `${layer.props?.fontSizePx ?? 16}px`,
                                                                fontWeight: layer.props?.fontWeight || '600',
                                                                fontStyle: layer.props?.fontStyle || 'normal',
                                                                textDecoration: layer.props?.textDecoration || 'none',
                                                            }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                onSelectLayer?.(layer.id);
                                                                onTextEditingLayerChange?.(layer.id);
                                                            }}
                                                        >
                                                            {layer.props?.text || 'Text'}
                                                        </div>
                                                    )
                                                ) : null}
                                                {editable ? (
                                                    <button
                                                        type="button"
                                                        className="absolute bottom-0 right-0 z-10 h-3 w-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-indigo-500 bg-white shadow dark:border-cyan-400"
                                                        aria-label="Resize layer"
                                                        onMouseDown={(e) => startResize(e, layer)}
                                                    />
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {adjustGarmentBackground && hasGarmentBg ? (
                            <div
                                role="presentation"
                                className="absolute inset-0 z-[40] cursor-move bg-transparent"
                                aria-label="Drag to reposition garment background"
                                title="Drag to move background"
                                onMouseDown={handleGarmentBgAdjustMouseDown}
                            />
                        ) : null}
                    </div>
                ) : (
                    <div className="flex h-80 w-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white/60 dark:border-gray-700 dark:bg-gray-900/60">
                        <p className="text-sm font-medium text-gray-400">No product selected</p>
                        <p className="mt-1 text-xs text-gray-300 dark:text-gray-500">Go back to Projects and open a project</p>
                    </div>
                )}
            </div>
        </div>
    );
}
