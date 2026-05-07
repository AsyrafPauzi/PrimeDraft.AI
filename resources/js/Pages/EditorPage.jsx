import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Undo2,
    Redo2,
    Info,
    ZoomIn,
    ZoomOut,
    Hand,
    Save,
    Wand2,
    X,
    PackagePlus,
} from 'lucide-react';
import { AssetLibraryPanel, ToolContentPanel } from '../Components/Editor/AssetLibraryPanel';
import { CanvasWorkspace } from '../Components/Editor/CanvasWorkspace';
import { SaveProductWizard } from '../Components/Editor/SaveProductWizard';
import { AiControlPanel } from '../Components/AIPanel/AiControlPanel';
import { Button } from '../components/ui/button';
import { createGeneration, downloadHighRes, saveScratchLayout } from '../lib/api';
import templates from '../data/editor/templates.json';
import fonts from '../data/editor/fonts.json';
import stockImages from '../data/editor/stock-images.json';
import { getScratchMerchandise } from '../lib/merchandisePreview';
import { cn } from '../lib/utils';
import {
    addLayerToSide,
    cloneLayout,
    defaultLayerTransform,
    getSidesForMerchandise,
    mergeScratchForSave,
    moveLayerZIndex,
    nextLayerId,
    normalizeScratchLayout,
    defaultGarmentBackgroundPosition,
    removeLayerFromSide,
    updateLayerOnSide,
    updateLayerTransformOnSide,
} from '../lib/editorLayout';

const UNDO_DEPTH = 30;

function templateToLayers(template) {
    const blocks = template?.layout?.blocks;
    if (!Array.isArray(blocks)) return [];
    let z = 1;
    const layers = [];
    let yOff = 0;
    for (const b of blocks) {
        if (b.type === 'text') {
            layers.push({
                id: nextLayerId(),
                type: 'text',
                zIndex: z++,
                transform: { ...defaultLayerTransform(0.15, 0.18 + yOff, 0.7, 0.12), rotation: 0 },
                props: { text: b.value || 'Text', fontFamily: b.font || 'Inter', fontSizePx: 20, color: '#111827' },
            });
            yOff += 0.14;
        } else if (b.type === 'image' && b.value) {
            layers.push({
                id: nextLayerId(),
                type: 'image',
                zIndex: z++,
                transform: { ...defaultLayerTransform(0.2, 0.22 + yOff, 0.45, 0.28), rotation: 0 },
                props: { src: b.value },
            });
            yOff += 0.18;
        }
    }
    return layers;
}

export function EditorPage({ token, selectedProjectId, selectedProject, onNotify, role = 'normal', onProjectScratchUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    /** App shell hides on `/editor` – use full height of standalone container */
    const editorReplacesShell = location.pathname.replace(/\/$/, '') === '/editor';
    const [viewMode, setViewMode] = useState('edit');
    const [activeTool, setActiveTool] = useState(null);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [activeSide, setActiveSide] = useState(() => getSidesForMerchandise('')[0] || 'Front');
    const [zoom, setZoom] = useState(100);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedFont, setSelectedFont] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const merchandise = getScratchMerchandise(selectedProject?.scratch_layout);
    const projectName = selectedProject?.name || (selectedProjectId ? `Project #${selectedProjectId}` : null);

    const [layout, setLayout] = useState(() => normalizeScratchLayout(selectedProject?.scratch_layout, merchandise));
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    const productSides = useMemo(
        () => getSidesForMerchandise(merchandise || layout.merchandise || ''),
        [merchandise, layout.merchandise]
    );

    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const [interactionMode, setInteractionMode] = useState('default');
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [saveWizardOpen, setSaveWizardOpen] = useState(false);
    const [adjustGarmentBackground, setAdjustGarmentBackground] = useState(false);

    const lastHydratedProjectKey = useRef(null);

    useEffect(() => {
        if (!selectedProjectId) {
            lastHydratedProjectKey.current = null;
            return;
        }
        if (!selectedProject || selectedProject.id !== selectedProjectId) {
            return;
        }
        const key = String(selectedProjectId);
        if (lastHydratedProjectKey.current === key) {
            return;
        }
        lastHydratedProjectKey.current = key;
        const merch = getScratchMerchandise(selectedProject.scratch_layout);
        setLayout(normalizeScratchLayout(selectedProject.scratch_layout, merch));
        setPast([]);
        setFuture([]);
        setSelectedLayerId(null);
        setPanOffset({ x: 0, y: 0 });
        setInteractionMode('default');
        setActiveSide(getSidesForMerchandise(merch || '')[0] || 'Front');
    }, [selectedProjectId, selectedProject]);

    useEffect(() => {
        if (!productSides.includes(activeSide)) {
            setActiveSide(productSides[0] || 'Front');
        }
    }, [productSides, activeSide]);

    useEffect(() => {
        if (activeTool !== 'colors') {
            setAdjustGarmentBackground(false);
        }
    }, [activeTool]);

    const commitLayout = useCallback((nextOrFn) => {
        const current = layoutRef.current;
        const next = typeof nextOrFn === 'function' ? nextOrFn(current) : nextOrFn;
        if (next === current) {
            return;
        }
        setPast((p) => [...p.slice(-(UNDO_DEPTH - 1)), cloneLayout(current)]);
        setFuture([]);
        setLayout(next);
    }, []);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        setPast((p) => p.slice(0, -1));
        setFuture((f) => [cloneLayout(layoutRef.current), ...f]);
        setLayout(prev);
        setStatusMessage('Undo.');
    }, [past]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const [next, ...rest] = future;
        setFuture(rest);
        setPast((p) => [...p, cloneLayout(layoutRef.current)]);
        setLayout(next);
        setStatusMessage('Redo.');
    }, [future]);

    const layersForSide = useMemo(() => layout?.sides?.[activeSide]?.layers ?? [], [layout, activeSide]);

    const addImageFromSrc = useCallback(
        (src) => {
            if (!src) return;
            commitLayout((cur) => {
                const list = cur.sides?.[activeSide]?.layers ?? [];
                const z = (list.length ? Math.max(...list.map((l) => l.zIndex || 0)) : 0) + 1;
                const layer = {
                    id: nextLayerId(),
                    type: 'image',
                    zIndex: z,
                    transform: defaultLayerTransform(0.28, 0.32, 0.36, 0.26),
                    props: { src },
                };
                return addLayerToSide(cur, activeSide, layer);
            });
            setStatusMessage('Image added to canvas.');
        },
        [activeSide, commitLayout]
    );

    const handleUploadImageFile = useCallback(
        (file) => {
            if (!file?.type?.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    addImageFromSrc(reader.result);
                }
            };
            reader.readAsDataURL(file);
        },
        [addImageFromSrc]
    );

    const handleAddTextBlock = useCallback(() => {
        const fontFamily = selectedFont?.family || 'Inter';
        const id = nextLayerId();
        commitLayout((cur) => {
            const list = cur.sides?.[activeSide]?.layers ?? [];
            const z = (list.length ? Math.max(...list.map((l) => l.zIndex || 0)) : 0) + 1;
            const layer = {
                id,
                type: 'text',
                zIndex: z,
                transform: defaultLayerTransform(0.2, 0.28, 0.6, 0.14),
                props: { text: 'Your text', fontFamily, fontSizePx: 22, color: '#111827' },
            };
            return addLayerToSide(cur, activeSide, layer);
        });
        setSelectedLayerId(id);
        setStatusMessage('Text block added.');
    }, [activeSide, selectedFont, commitLayout]);

    const handleProductColorChange = useCallback(
        (color) => {
            commitLayout((cur) => ({ ...cur, productBaseColor: color }));
            setStatusMessage('Product color updated.');
        },
        [commitLayout]
    );

    const handleProductGarmentBackgroundPreset = useCallback(
        (preset) => {
            if (!preset?.src) return;
            commitLayout((cur) => ({
                ...cur,
                productGarmentBackgroundSrc: preset.src,
                productGarmentBackgroundPresetKey: preset.id,
                productGarmentBackgroundPosition: defaultGarmentBackgroundPosition(),
            }));
            setAdjustGarmentBackground(false);
            setStatusMessage(`Garment background: ${preset.label}`);
        },
        [commitLayout]
    );

    const handleProductGarmentBackgroundFile = useCallback(
        (file) => {
            if (!file?.type?.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    commitLayout((cur) => ({
                        ...cur,
                        productGarmentBackgroundSrc: reader.result,
                        productGarmentBackgroundPresetKey: null,
                        productGarmentBackgroundPosition: defaultGarmentBackgroundPosition(),
                    }));
                    setStatusMessage('Custom garment background applied.');
                    setAdjustGarmentBackground(false);
                }
            };
            reader.readAsDataURL(file);
        },
        [commitLayout]
    );

    const handleProductGarmentBackgroundClear = useCallback(() => {
        commitLayout((cur) => ({
            ...cur,
            productGarmentBackgroundSrc: null,
            productGarmentBackgroundPresetKey: null,
            productGarmentBackgroundPosition: defaultGarmentBackgroundPosition(),
        }));
        setAdjustGarmentBackground(false);
        setStatusMessage('Garment background cleared.');
    }, [commitLayout]);

    const handleGarmentBackgroundPositionChange = useCallback(
        (position) => {
            commitLayout((cur) => ({ ...cur, productGarmentBackgroundPosition: position }));
        },
        [commitLayout]
    );

    const handleSelectTemplate = useCallback(
        (template) => {
            setSelectedTemplate(template);
            commitLayout((cur) => {
                let next = cur;
                for (const L of templateToLayers(template)) {
                    next = addLayerToSide(next, activeSide, L);
                }
                return next;
            });
            setStatusMessage(`Template applied: ${template.name}`);
        },
        [activeSide, commitLayout]
    );

    const handleSelectFont = useCallback(
        (font) => {
            setSelectedFont(font);
            if (!selectedLayerId) {
                setStatusMessage(`Font "${font.name}" will be used for the next text block.`);
                return;
            }
            commitLayout((cur) => {
                const sideLayers = cur.sides?.[activeSide]?.layers || [];
                const target = sideLayers.find((l) => l.id === selectedLayerId);
                if (target?.type === 'text') {
                    return updateLayerOnSide(cur, activeSide, selectedLayerId, {
                        props: { ...target.props, fontFamily: font.family || 'sans-serif' },
                    });
                }
                return cur;
            });
            const target = (layout.sides?.[activeSide]?.layers || []).find((l) => l.id === selectedLayerId);
            setStatusMessage(target?.type === 'text' ? `Font applied: ${font.name}` : `Font "${font.name}" will be used for the next text block.`);
        },
        [layout, activeSide, selectedLayerId, commitLayout]
    );

    const handleSelectImage = useCallback(
        (image) => {
            setSelectedImage(image);
            if (image?.src) {
                addImageFromSrc(image.src);
            }
        },
        [addImageFromSrc]
    );

    const handleLayerReorder = useCallback(
        (layerId, direction) => {
            commitLayout((cur) => moveLayerZIndex(cur, activeSide, layerId, direction));
        },
        [activeSide, commitLayout]
    );

    const handleLayerDelete = useCallback(
        (layerId) => {
            commitLayout((cur) => removeLayerFromSide(cur, activeSide, layerId));
            setSelectedLayerId((id) => (id === layerId ? null : id));
            setStatusMessage('Layer removed.');
        },
        [activeSide, commitLayout]
    );

    useEffect(() => {
        function onKeyDown(event) {
            if (!selectedLayerId) return;
            if (event.key !== 'Backspace' && event.key !== 'Delete') return;
            const target = event.target;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
            event.preventDefault();
            handleLayerDelete(selectedLayerId);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedLayerId, handleLayerDelete]);

    const handleUpdateTextLayer = useCallback(
        (layerId, patch) => {
            commitLayout((cur) => {
                const sideLayers = cur.sides?.[activeSide]?.layers || [];
                const target = sideLayers.find((l) => l.id === layerId);
                if (!target || target.type !== 'text') return cur;
                return updateLayerOnSide(cur, activeSide, layerId, {
                    props: { ...target.props, ...patch },
                });
            });
        },
        [activeSide, commitLayout]
    );

    const handleUpdateLayerTransform = useCallback(
        (layerId, transformPatch) => {
            setLayout((current) => updateLayerTransformOnSide(current, activeSide, layerId, transformPatch));
        },
        [activeSide]
    );

    const handleLayoutSavedFromWizard = useCallback(
        (scratch) => {
            onProjectScratchUpdate?.(selectedProjectId, scratch);
        },
        [onProjectScratchUpdate, selectedProjectId]
    );

    async function handleSave() {
        if (!selectedProjectId) {
            setErrorMessage('No project selected. Go back to Projects and open a project.');
            return;
        }
        setErrorMessage('');
        setLoading(true);
        try {
            const payload = {
                ...mergeScratchForSave(selectedProject?.scratch_layout, layout),
                template: selectedTemplate?.id ?? null,
                font: selectedFont?.id ?? null,
                image: selectedImage?.id ?? null,
            };
            const res = await saveScratchLayout(token, selectedProjectId, payload);
            if (res?.project?.scratch_layout) {
                onProjectScratchUpdate?.(selectedProjectId, res.project.scratch_layout);
            }
            setStatusMessage('Design saved.');
            onNotify?.('Design saved successfully.', 'success');
        } catch (error) {
            setErrorMessage(error.message);
            onNotify?.(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate(promptValue) {
        if (!selectedProjectId) {
            setErrorMessage('No project selected.');
            return;
        }
        setErrorMessage('');
        setLoading(true);
        try {
            await createGeneration(token, selectedProjectId, promptValue || 'Generate high fidelity print design');
            setStatusMessage('AI generation queued. Check back shortly.');
            onNotify?.('AI generation queued.', 'success');
        } catch (error) {
            setErrorMessage(error.message);
            onNotify?.(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateSimilar(panelPrompt) {
        const base = panelPrompt?.trim() || prompt?.trim() || 'Generate print design';
        await handleGenerate(`Create a variation of: ${base}`);
    }

    function handleEnhancePrompt(panelPrompt) {
        const current = panelPrompt?.trim() || prompt?.trim();
        if (!current) {
            setErrorMessage('Enter a prompt first.');
            return;
        }
        setPrompt(`${current}. Clean composition, high contrast, production-ready print details, premium finish.`);
        setStatusMessage('Prompt enhanced.');
    }

    async function handleDownloadHighRes() {
        if (!selectedProjectId) {
            setErrorMessage('No project selected.');
            return;
        }
        setErrorMessage('');
        setLoading(true);
        try {
            const payload = await downloadHighRes(token, selectedProjectId, { dpi: 360, color_count: 6 });
            setStatusMessage(`360 DPI file ready: ${payload.download_url}`);
            onNotify?.('360 DPI print file ready.', 'success');
            if (typeof window !== 'undefined' && payload.download_url) {
                window.open(payload.download_url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            setErrorMessage(error.message);
            onNotify?.(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    function togglePanMode() {
        setInteractionMode((m) => {
            const next = m === 'pan' ? 'default' : 'pan';
            setStatusMessage(next === 'pan' ? 'Pan mode on — drag the garment.' : 'Pan mode off.');
            return next;
        });
    }

    return (
        <div
            className={cn(
                'flex min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900',
                editorReplacesShell ? 'h-full min-h-0 w-full rounded-none border-0 shadow-none' : 'h-[calc(100svh-5rem)] rounded-xl border border-gray-200 shadow-sm dark:border-gray-700'
            )}
        >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/projects')}
                        className="flex shrink-0 items-center gap-1 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        title="Back to Projects"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    {projectName ? (
                        <span className="max-w-40 truncate text-sm font-medium text-gray-700 dark:text-gray-200">{projectName}</span>
                    ) : (
                        <span className="text-sm italic text-gray-400">No project selected</span>
                    )}

                    <Info className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />

                    <div className="mx-1 h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700" />

                    <button
                        type="button"
                        onClick={undo}
                        disabled={past.length === 0}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        title="Undo"
                    >
                        <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={redo}
                        disabled={future.length === 0}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        title="Redo"
                    >
                        <Redo2 className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setViewMode('edit')}
                            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                viewMode === 'edit'
                                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('preview')}
                            className={`border-l border-gray-200 px-4 py-1.5 text-sm font-medium transition-colors dark:border-gray-700 ${
                                viewMode === 'preview'
                                    ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                            }`}
                        >
                            Preview
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAiPanelOpen((current) => !current)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            aiPanelOpen
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Wand2 className="h-4 w-4" />
                        AI Design
                    </button>

                    <Button size="sm" disabled={loading || !selectedProjectId} onClick={() => void handleSave()} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {loading ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <AssetLibraryPanel
                    templates={templates}
                    fonts={fonts}
                    stockImages={stockImages}
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                />

                <ToolContentPanel
                    activeTool={activeTool}
                    templates={templates}
                    fonts={fonts}
                    stockImages={stockImages}
                    onSelectTemplate={handleSelectTemplate}
                    onSelectFont={handleSelectFont}
                    onSelectImage={handleSelectImage}
                    onUploadImageFile={handleUploadImageFile}
                    onAddTextBlock={handleAddTextBlock}
                    productBaseColor={layout.productBaseColor}
                    onProductColorChange={handleProductColorChange}
                    activeSide={activeSide}
                    layers={layersForSide}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={setSelectedLayerId}
                    onLayerReorder={handleLayerReorder}
                    onLayerDelete={handleLayerDelete}
                    onUpdateTextLayer={handleUpdateTextLayer}
                    productGarmentBackgroundSrc={layout.productGarmentBackgroundSrc}
                    productGarmentBackgroundPresetKey={layout.productGarmentBackgroundPresetKey}
                    adjustGarmentBackground={adjustGarmentBackground}
                    onAdjustGarmentBackgroundChange={setAdjustGarmentBackground}
                    onProductGarmentBackgroundPreset={handleProductGarmentBackgroundPreset}
                    onProductGarmentBackgroundFile={handleProductGarmentBackgroundFile}
                    onProductGarmentBackgroundClear={handleProductGarmentBackgroundClear}
                />

                <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#8f8f8f] dark:bg-[#18181b]">
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                        <CanvasWorkspace
                            merchandise={merchandise}
                            side={activeSide}
                            viewMode={viewMode}
                            zoom={zoom}
                            productBaseColor={layout.productBaseColor}
                            productGarmentBackgroundSrc={layout.productGarmentBackgroundSrc}
                            productGarmentBackgroundPosition={layout.productGarmentBackgroundPosition}
                            onGarmentBackgroundPositionChange={handleGarmentBackgroundPositionChange}
                            adjustGarmentBackground={adjustGarmentBackground}
                            layers={layersForSide}
                            selectedLayerId={selectedLayerId}
                            onSelectLayer={setSelectedLayerId}
                            onUpdateLayerTransform={handleUpdateLayerTransform}
                            onAddImageFromSrc={addImageFromSrc}
                            interactionMode={interactionMode}
                            panOffset={panOffset}
                            onPanOffsetChange={setPanOffset}
                        />
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-gray-200/80 bg-white/90 px-4 py-2 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/90">
                        {productSides.map((side) => (
                            <button
                                key={side}
                                type="button"
                                onClick={() => setActiveSide(side)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                    activeSide === side
                                        ? 'bg-gray-800 text-white shadow dark:bg-white dark:text-gray-900'
                                        : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500'
                                }`}
                            >
                                {side}
                            </button>
                        ))}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-1.5 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.max(z - 10, 10))}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                                title="Zoom out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="min-w-[3rem] text-center text-xs font-medium text-gray-500">{zoom}%</span>
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.min(z + 10, 200))}
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                                title="Zoom in"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={togglePanMode}
                                className={`rounded p-1.5 ${
                                    interactionMode === 'pan'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-cyan-500/20 dark:text-cyan-300'
                                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800'
                                }`}
                                title="Pan tool"
                            >
                                <Hand className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {statusMessage ? (
                                <span className="max-w-[10rem] truncate text-xs text-emerald-600 dark:text-emerald-400 sm:max-w-xs">{statusMessage}</span>
                            ) : null}
                            {errorMessage ? (
                                <span className="max-w-[10rem] truncate text-xs text-red-600 dark:text-red-400 sm:max-w-xs" role="alert">
                                    {errorMessage}
                                </span>
                            ) : null}
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={!selectedProjectId}
                                onClick={() => setSaveWizardOpen(true)}
                                className="gap-1 text-xs"
                            >
                                <PackagePlus className="h-3.5 w-3.5" />
                                Save product
                            </Button>
                        </div>
                    </div>
                </main>

                {aiPanelOpen ? (
                    <div className="relative flex shrink-0">
                        <button
                            type="button"
                            onClick={() => setAiPanelOpen(false)}
                            className="absolute right-2 top-2 z-10 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                            title="Close AI panel"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <AiControlPanel
                            prompt={prompt}
                            onPromptChange={setPrompt}
                            onGenerate={handleGenerate}
                            onGenerateSimilar={handleGenerateSimilar}
                            onEnhancePrompt={handleEnhancePrompt}
                            onDownloadHighRes={handleDownloadHighRes}
                            disabled={loading}
                        />
                    </div>
                ) : null}
            </div>

            <SaveProductWizard
                open={saveWizardOpen}
                onOpenChange={setSaveWizardOpen}
                token={token}
                projectId={selectedProjectId}
                project={selectedProject}
                layout={layout}
                onLayoutSaved={handleLayoutSavedFromWizard}
                onNotify={onNotify}
                onDraftCreated={() => setStatusMessage('Draft order created.')}
            />
        </div>
    );
}
