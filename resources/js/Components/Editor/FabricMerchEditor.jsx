import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, FabricImage, IText } from 'fabric';
import { fabricHighFidelity } from '../../lib/api';
import {
    getMerchandiseColorMaskUrlForSide,
    getMerchandiseMockupUrlForSide,
    getMerchandisePreviewUrlForSide,
} from '../../lib/merchandisePreview';
import { cssUrlValue } from '../../lib/cssSafeUrl';
import { defaultGarmentBackgroundPosition, nextLayerId } from '../../lib/editorLayout';
import { ensurePdIdsOnCanvasObjects, fabricObjectsToLegacyLayers, getFabricPdId } from '../../lib/fabricLayerBridge';

const DEFAULT_W = 440;
const DEFAULT_H = 520;

/** Opaque white would hide the HTML garment mockup stacked under the Fabric layer (z-22). */
const FABRIC_STAGE_BACKGROUND = 'rgba(0,0,0,0)';

function applyTransparentFabricStage(canvas) {
    if (!canvas) return;
    canvas.set('backgroundColor', FABRIC_STAGE_BACKGROUND);
    canvas.requestRenderAll();
}

function getLegacyLayersFromCanvas(canvas) {
    if (!canvas?.getObjects) return [];
    const cw = canvas.getWidth() || DEFAULT_W;
    const ch = canvas.getHeight() || DEFAULT_H;
    return fabricObjectsToLegacyLayers(canvas.getObjects(), cw, ch);
}

const FULL_BLEED_INSET = { top: '0%', left: '0%', right: '0%', bottom: '0%' };
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
    return PRINT_INSET_BY_SIDE[side] || FULL_BLEED_INSET;
}

/** Inline IText edits do not always fire object:modified; listen on the object. */
function wireTextEditingPersist(o, schedulePersist) {
    if (!o || typeof o.on !== 'function') return;
    const t = String(o.type || '').toLowerCase();
    if (!['i-text', 'itext', 'textbox'].includes(t)) return;
    if (/** @type {{ __pdWired?: boolean }} */ (o).__pdWired) return;
    /** @type {{ __pdWired?: boolean }} */ (o).__pdWired = true;
    const run = () => {
        schedulePersist();
    };
    o.on('changed', run);
    o.on('editing:exited', run);
}

function wireAllTextObjects(canvas, schedulePersist) {
    if (!canvas?.getObjects) return;
    for (const o of canvas.getObjects()) {
        wireTextEditingPersist(o, schedulePersist);
    }
}

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
}

/**
 * Fabric.js artboard on garment mockup. Export / high-fidelity / validate are invoked from the AI Design side panel.
 */
export const FabricMerchEditor = forwardRef(function FabricMerchEditor(
    {
        activeSide,
        initialFabric,
        onPersist,
        onSelectionChange,
        token,
        projectId,
        onNotify,
        onPrintPipelineStateChange,
        disabled = false,
        zoom = 100,
        merchandise = '',
        material = '',
        productBaseColor = '#ffffff',
        productGarmentBackgroundSrc = null,
        productGarmentBackgroundPosition,
        onGarmentBackgroundPositionChange,
        adjustGarmentBackground = false,
        viewMode = 'edit',
        interactionMode = 'default',
        panOffset = { x: 0, y: 0 },
        onPanOffsetChange,
    },
    ref
) {
    const hostRef = useRef(null);
    const printHostRef = useRef(null);
    const garmentRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const persistTimerRef = useRef(null);
    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;

    const label = String(merchandise || material || '').trim();
    const flatGarmentUrl = getMerchandisePreviewUrlForSide(label, activeSide);
    const mockupGarmentUrl = getMerchandiseMockupUrlForSide(label, activeSide);
    const svgUrl = viewMode === 'edit' ? flatGarmentUrl : mockupGarmentUrl || flatGarmentUrl;
    const maskUrl = getMerchandiseColorMaskUrlForSide(label, activeSide);
    const printInset = getPrintInsetForSide(activeSide);
    const hasGarmentBg = Boolean(productGarmentBackgroundSrc?.trim?.());

    const bgPos =
        productGarmentBackgroundPosition && typeof productGarmentBackgroundPosition === 'object'
            ? productGarmentBackgroundPosition
            : defaultGarmentBackgroundPosition();
    const [bgPreviewPos, setBgPreviewPos] = useState(null);
    const [bgDrag, setBgDrag] = useState(null);
    const [panState, setPanState] = useState(null);
    const displayBgPos = bgPreviewPos ?? bgPos;

    useEffect(() => {
        setBgPreviewPos(null);
    }, [productGarmentBackgroundSrc, bgPos.x, bgPos.y]);

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

    const hexLooksWhite = () => {
        const c = String(productBaseColor || '#ffffff').trim().toLowerCase();
        return c === '#ffffff' || c === '#fff';
    };
    const tintOpacityWhite = () => {
        if (hexLooksWhite()) return 0;
        if (!hasGarmentBg) return 0.75;
        return 0.24;
    };

    const editable = viewMode === 'edit' && interactionMode === 'default' && !adjustGarmentBackground;

    const [busy, setBusy] = useState(false);
    const [highFiUrl, setHighFiUrl] = useState(null);
    const [validationOk, setValidationOk] = useState(null);

    useEffect(() => {
        onPrintPipelineStateChange?.({ busy, highFiUrl, validationOk });
    }, [busy, highFiUrl, validationOk, onPrintPipelineStateChange]);

    const schedulePersist = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !onPersist) return;
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            ensurePdIdsOnCanvasObjects(canvas.getObjects());
            const legacy = getLegacyLayersFromCanvas(canvas);
            onPersist(canvas.toJSON(), legacy);
        }, 350);
    }, [onPersist]);

    const flushPersist = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !onPersist) return;
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        ensurePdIdsOnCanvasObjects(canvas.getObjects());
        const legacy = getLegacyLayersFromCanvas(canvas);
        onPersist(canvas.toJSON(), legacy);
    }, [onPersist]);

    const emitSelection = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            onSelectionChangeRef.current?.(null);
            return;
        }
        const active = canvas.getActiveObject();
        if (!active) {
            onSelectionChangeRef.current?.(null);
            return;
        }
        if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
            const first = active.getObjects()[0];
            onSelectionChangeRef.current?.(getFabricPdId(first) ?? null);
            return;
        }
        onSelectionChangeRef.current?.(getFabricPdId(active) ?? null);
    }, []);

    const exportCanvasJson = useCallback(() => {
        if (disabled) {
            onNotify?.('Select a project first.', 'error');
            return;
        }
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const json = JSON.stringify(canvas.toJSON(), null, 2);
        downloadText(json, `primedraft-fabric-${String(activeSide).replace(/\s+/g, '-')}.json`);
        onNotify?.('Fabric JSON downloaded.', 'success');
    }, [activeSide, disabled, onNotify]);

    const exportPngPreview = useCallback(() => {
        if (disabled) {
            onNotify?.('Select a project first.', 'error');
            return;
        }
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataUrl(url, `primedraft-preview-${String(activeSide).replace(/\s+/g, '-')}.png`);
        onNotify?.('PNG preview downloaded.', 'success');
    }, [activeSide, disabled, onNotify]);

    const runHighFidelity = useCallback(
        async (promptStr) => {
            if (disabled || !token || !projectId) {
                onNotify?.('Select a project first.', 'error');
                return;
            }
            const canvas = fabricCanvasRef.current;
            if (!canvas) return;
            const p = String(promptStr || '').trim();
            if (!p) {
                onNotify?.('Enter a prompt for the high-fidelity pass.', 'error');
                return;
            }
            const previewPng = canvas.toDataURL({ format: 'png', multiplier: 2 });
            const fabricJson = canvas.toJSON();
            setBusy(true);
            setHighFiUrl(null);
            setValidationOk(null);
            try {
                const res = await fabricHighFidelity(token, projectId, {
                    prompt: p,
                    preview_png: previewPng,
                    fabric_json: fabricJson,
                });
                if (res?.data_url) {
                    setHighFiUrl(res.data_url);
                    onNotify?.('High-fidelity image ready.', 'success');
                }
            } catch (e) {
                onNotify?.(e?.message || 'High-fidelity request failed.', 'error');
        } finally {
            setBusy(false);
        }
        },
        [disabled, token, projectId, onNotify]
    );

    const exportFinalPng = useCallback(() => {
        if (disabled) {
            onNotify?.('Select a project first.', 'error');
            return;
        }
        const url = highFiUrl || fabricCanvasRef.current?.toDataURL({ format: 'png', multiplier: 2 });
        if (!url) return;
        downloadDataUrl(url, 'primedraft-production-export.png');
        onNotify?.('Production PNG downloaded.', 'success');
    }, [disabled, highFiUrl, onNotify]);

    useImperativeHandle(
        ref,
        () => ({
            flush: flushPersist,
            exportCanvasJson,
            exportPngPreview,
            runHighFidelity,
            exportFinalPng,
            getFabricJson() {
                const canvas = fabricCanvasRef.current;
                return canvas ? canvas.toJSON() : null;
            },
            deleteActiveSelection() {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return false;
                const active = canvas.getActiveObject();
                if (!active) return false;
                if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
                    for (const o of active.getObjects()) {
                        if (o.selectable !== false) canvas.remove(o);
                    }
                } else if (active.selectable !== false) {
                    canvas.remove(active);
                }
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                schedulePersist();
                emitSelection();
                return true;
            },
            nudgeActive(dx, dy) {
                const canvas = fabricCanvasRef.current;
                const active = canvas?.getActiveObject();
                if (!canvas || !active || active.selectable === false) return false;
                if (active.type === 'activeSelection' && typeof active.getObjects === 'function') {
                    for (const o of active.getObjects()) {
                        o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy });
                        o.setCoords();
                    }
                } else {
                    active.set({ left: (active.left || 0) + dx, top: (active.top || 0) + dy });
                    active.setCoords();
                }
                canvas.requestRenderAll();
                schedulePersist();
                return true;
            },
            removeLayerById(layerId) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !layerId) return false;
                const o = canvas.getObjects().find((obj) => getFabricPdId(obj) === layerId);
                if (!o) return false;
                canvas.remove(o);
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                schedulePersist();
                emitSelection();
                return true;
            },
            selectLayerById(layerId) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !layerId) return;
                const o = canvas.getObjects().find((obj) => getFabricPdId(obj) === layerId);
                if (!o) return;
                canvas.setActiveObject(o);
                canvas.requestRenderAll();
                emitSelection();
            },
            reorderLayersByIds(orderedIdsBottomToTop) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !Array.isArray(orderedIdsBottomToTop)) return;
                orderedIdsBottomToTop.forEach((id, targetIndex) => {
                    const obj = canvas.getObjects().find((o) => getFabricPdId(o) === id);
                    if (obj) canvas.moveObjectTo(obj, targetIndex);
                });
                canvas.requestRenderAll();
                schedulePersist();
            },
            setLayerLocked(layerId, locked) {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;
                const o = canvas.getObjects().find((obj) => getFabricPdId(obj) === layerId);
                if (!o) return;
                o.set({
                    selectable: !locked,
                    evented: !locked,
                    lockMovementX: locked,
                    lockMovementY: locked,
                });
                canvas.requestRenderAll();
                schedulePersist();
            },
            setLayerHidden(layerId, hidden) {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;
                const o = canvas.getObjects().find((obj) => getFabricPdId(obj) === layerId);
                if (!o) return;
                o.set({ visible: !hidden });
                canvas.requestRenderAll();
                schedulePersist();
            },
            async loadFromJSON(doc) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !doc || typeof doc !== 'object') return;
                await canvas.loadFromJSON(doc);
                applyTransparentFabricStage(canvas);
                ensurePdIdsOnCanvasObjects(canvas.getObjects());
                wireAllTextObjects(canvas, schedulePersist);
                canvas.requestRenderAll();
                schedulePersist();
                emitSelection();
            },
            importLegacyLayers(layers) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !Array.isArray(layers)) return Promise.resolve();
                const cw = canvas.getWidth() || DEFAULT_W;
                const ch = canvas.getHeight() || DEFAULT_H;
                canvas.discardActiveObject();
                [...canvas.getObjects()].forEach((o) => canvas.remove(o));
                const sorted = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
                const pending = [];
                for (const layer of sorted) {
                    if (!layer || typeof layer !== 'object') continue;
                    if (layer.type === 'text' && layer.props) {
                        const tx = layer.transform && typeof layer.transform === 'object' ? layer.transform : {};
                        const left = typeof tx.x === 'number' ? tx.x * cw : 40;
                        const top = typeof tx.y === 'number' ? tx.y * ch : 60;
                        const fs = Math.max(14, Math.round(Number(layer.props.fontSizePx) || 22));
                        const t = new IText(layer.props.text || 'Text', {
                            left,
                            top,
                            fontSize: fs,
                            fill: layer.props.color || '#111827',
                            fontFamily: layer.props.fontFamily || 'Inter, system-ui, sans-serif',
                            fontWeight: layer.props.fontWeight || '600',
                            fontStyle: layer.props.fontStyle || 'normal',
                            underline: layer.props.textDecoration === 'underline',
                            linethrough: layer.props.textDecoration === 'line-through',
                            editable: true,
                        });
                        t.set('pdId', layer.id || nextLayerId());
                        canvas.add(t);
                        wireTextEditingPersist(t, schedulePersist);
                    } else if (layer.type === 'image' && layer.props?.src) {
                        const tx = layer.transform && typeof layer.transform === 'object' ? layer.transform : {};
                        pending.push(
                            FabricImage.fromURL(layer.props.src, { crossOrigin: 'anonymous' }).then((img) => {
                                const tw = typeof tx.w === 'number' ? tx.w * cw : 160;
                                img.scaleToWidth(Math.max(40, tw));
                                img.set({
                                    left: typeof tx.x === 'number' ? tx.x * cw : 40,
                                    top: typeof tx.y === 'number' ? tx.y * ch : 80,
                                    pdId: layer.id || nextLayerId(),
                                });
                                canvas.add(img);
                            })
                        );
                    }
                }
                return Promise.all(pending).then(() => {
                    ensurePdIdsOnCanvasObjects(canvas.getObjects());
                    wireAllTextObjects(canvas, schedulePersist);
                    canvas.requestRenderAll();
                    schedulePersist();
                    emitSelection();
                });
            },
            addText(fontFamily) {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;
                const ff = fontFamily && String(fontFamily).trim() ? String(fontFamily).trim() : 'Inter, system-ui, sans-serif';
                const t = new IText('Your text', {
                    left: 60,
                    top: 80,
                    fontSize: 32,
                    fill: '#111827',
                    fontFamily: ff,
                    fontWeight: '600',
                    fontStyle: 'normal',
                    underline: false,
                    linethrough: false,
                    editable: true,
                });
                t.set('pdId', nextLayerId());
                canvas.add(t);
                wireTextEditingPersist(t, schedulePersist);
                canvas.setActiveObject(t);
                canvas.requestRenderAll();
                schedulePersist();
                emitSelection();
            },
            addImageFromUrl(url) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !url) return;
                FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
                    img.scaleToWidth(200);
                    img.set({ left: 40, top: 160, pdId: nextLayerId() });
                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.requestRenderAll();
                    schedulePersist();
                    emitSelection();
                });
            },
            addImageFromDataUrl(dataUrl) {
                this.addImageFromUrl(dataUrl);
            },
            clearFabricSelection() {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;
                canvas.discardActiveObject();
                canvas.requestRenderAll();
                emitSelection();
            },
            updateTextLayer(layerId, patch) {
                const canvas = fabricCanvasRef.current;
                if (!canvas || !layerId || !patch || typeof patch !== 'object') return;
                const o = canvas.getObjects().find((obj) => getFabricPdId(obj) === layerId);
                if (!o) return;
                const typeStr = String(o.type || '').toLowerCase();
                if (!['i-text', 'itext', 'textbox', 'text'].includes(typeStr)) return;
                if (patch.text !== undefined) o.set('text', patch.text);
                if (patch.fontFamily) o.set('fontFamily', patch.fontFamily);
                if (patch.fontSizePx != null) o.set('fontSize', Number(patch.fontSizePx) || 16);
                if (patch.color) o.set('fill', patch.color);
                if (patch.fontWeight) o.set('fontWeight', patch.fontWeight);
                if (patch.fontStyle) o.set('fontStyle', patch.fontStyle);
                if (patch.textDecoration !== undefined) {
                    o.set({
                        underline: patch.textDecoration === 'underline',
                        linethrough: patch.textDecoration === 'line-through',
                    });
                }
                canvas.requestRenderAll();
                schedulePersist();
            },
        }),
        [
            flushPersist,
            schedulePersist,
            emitSelection,
            exportCanvasJson,
            exportPngPreview,
            runHighFidelity,
            exportFinalPng,
        ]
    );

    useEffect(() => {
        const el = hostRef.current;
        if (!el) return undefined;

        const canvas = new Canvas(el, {
            width: DEFAULT_W,
            height: DEFAULT_H,
            backgroundColor: FABRIC_STAGE_BACKGROUND,
            preserveObjectStacking: true,
        });
        fabricCanvasRef.current = canvas;

        const onChange = () => {
            schedulePersist();
        };
        canvas.on('object:modified', onChange);
        canvas.on('object:added', (e) => {
            wireTextEditingPersist(e.target, schedulePersist);
            onChange();
        });
        canvas.on('object:removed', onChange);
        canvas.on('selection:created', emitSelection);
        canvas.on('selection:updated', emitSelection);
        canvas.on('selection:cleared', emitSelection);

        const seed = initialFabric;
        void (async () => {
            try {
                if (seed && typeof seed === 'object' && Object.keys(seed).length > 0) {
                    await canvas.loadFromJSON(seed);
                    applyTransparentFabricStage(canvas);
                    ensurePdIdsOnCanvasObjects(canvas.getObjects());
                    wireAllTextObjects(canvas, schedulePersist);
                    canvas.requestRenderAll();
                    const legacy = getLegacyLayersFromCanvas(canvas);
                    onPersist?.(canvas.toJSON(), legacy);
                }
            } catch {
                /* ignore corrupt */
            }
        })();

        const host = printHostRef.current;
        let ro;
        if (host && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver((entries) => {
                const cr = entries[0]?.contentRect;
                if (!cr?.width || !cr?.height) return;
                const w = Math.max(160, Math.floor(cr.width));
                const h = Math.max(200, Math.floor(cr.height));
                canvas.setDimensions({ width: w, height: h });
                canvas.requestRenderAll();
            });
            ro.observe(host);
        }

        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
            ro?.disconnect();
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; parent `key` remounts for new seed / side
    }, []);

    const z = typeof zoom === 'number' && zoom > 0 ? zoom / 100 : 1;
    const panX = typeof panOffset?.x === 'number' ? panOffset.x : 0;
    const panY = typeof panOffset?.y === 'number' ? panOffset.y : 0;

    const artboard = svgUrl ? (
        <div className="relative inline-block select-none" ref={garmentRef}>
            <img
                src={svgUrl}
                alt={`${label || 'Merchandise'} blank – ${activeSide}`}
                className={`relative z-[6] block h-[480px] w-auto max-w-[min(100vw,560px)] drop-shadow-xl ${
                    interactionMode === 'pan' && !adjustGarmentBackground ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
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
                    ref={printHostRef}
                    className={`absolute flex items-center justify-center ${editable ? 'pointer-events-auto' : 'pointer-events-none'}`}
                    style={printInset}
                >
                    <canvas ref={hostRef} className="block max-h-full max-w-full touch-none" />
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
        <div ref={printHostRef} className="flex min-h-[320px] min-w-[280px] items-center justify-center rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/10 dark:bg-gray-950 dark:ring-white/10">
            <canvas ref={hostRef} width={DEFAULT_W} height={DEFAULT_H} className="block touch-none" />
        </div>
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
                className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-[#6b6b6b] p-3 dark:bg-[#141416]"
                style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${z})`,
                    transformOrigin: 'center center',
                }}
            >
                {artboard}
            </div>
        </div>
    );
});
