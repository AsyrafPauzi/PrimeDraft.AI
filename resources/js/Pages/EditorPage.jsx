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
    Pencil,
    Scan,
} from 'lucide-react';
import { AssetLibraryPanel, ToolContentPanel } from '../Components/Editor/AssetLibraryPanel';
import { FabricMerchEditor } from '../Components/Editor/FabricMerchEditor';
import { SaveProductWizard } from '../Components/Editor/SaveProductWizard';
import { AiControlPanel } from '../Components/AIPanel/AiControlPanel';
import { Button } from '../components/ui/button';
import { runProjectPreflight, saveScratchLayout } from '../lib/api';
import templates from '../data/editor/templates.json';
import fonts from '../data/editor/fonts.json';
import stockImages from '../data/editor/stock-images.json';
import { getScratchMerchandise } from '../lib/merchandisePreview';
import { cn } from '../lib/utils';
import {
    cloneLayout,
    defaultLayerTransform,
    getSidesForMerchandise,
    mergeScratchForSave,
    nextLayerId,
    normalizeScratchLayout,
    defaultGarmentBackgroundPosition,
    updateLayerTransformOnSide,
} from '../lib/editorLayout';
import { loadUserImageLibrary, loadUserTemplates, saveUserImageLibrary, saveUserTemplates } from '../lib/userEditorStorage';

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

export function EditorPage({ token, selectedProjectId, selectedProject, onNotify, role = 'normal', onProjectFieldsUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    /** App shell hides on `/editor` – use full height of standalone container */
    const editorReplacesShell = location.pathname.replace(/\/$/, '') === '/editor';
    const [activeTool, setActiveTool] = useState(null);
    /** @type {[Array<{ id: string, name: string, src: string, addedAt: string }>, function]} */
    const [userLibrary, setUserLibrary] = useState(() => loadUserImageLibrary());
    /** @type {[Array<{ id: string, name: string, userSaved?: boolean, layers?: unknown[] }>, function]} */
    const [userTemplates, setUserTemplates] = useState(() => loadUserTemplates());
    const fabricApiRef = useRef(null);
    const [layoutReplayToken, setLayoutReplayToken] = useState(0);
    const [aiPanelOpen, setAiPanelOpen] = useState(false);
    const [activeSide, setActiveSide] = useState(() => getSidesForMerchandise('')[0] || 'Front');
    const [zoom, setZoom] = useState(100);
    const [highFidelityPrompt, setHighFidelityPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedFont, setSelectedFont] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const scratchMerchandise = getScratchMerchandise(selectedProject?.scratch_layout);
    const projectName = selectedProject?.name || (selectedProjectId ? `Project #${selectedProjectId}` : null);

    const [layout, setLayout] = useState(() => normalizeScratchLayout(selectedProject?.scratch_layout, scratchMerchandise));
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    /** Prefer API scratch `merchandise`, else normalized layout (e.g. after template pick before next save). */
    const merchandise = scratchMerchandise || String(layout.merchandise || '').trim();

    const productSides = useMemo(() => getSidesForMerchandise(merchandise || ''), [merchandise]);

    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const [interactionMode, setInteractionMode] = useState('default');
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [saveWizardOpen, setSaveWizardOpen] = useState(false);
    const [adjustGarmentBackground, setAdjustGarmentBackground] = useState(false);
    const [preflightProfile, setPreflightProfile] = useState(() => selectedProject?.print_profile || 'dtf');
    const [preflightLoading, setPreflightLoading] = useState(false);
    /** Flat 2D garment template vs mockup-style preview (read-only on canvas). */
    const [editorGarmentView, setEditorGarmentView] = useState(() => /** @type {'edit' | 'preview'} */ ('edit'));
    const [fabricPrintPipeline, setFabricPrintPipeline] = useState({
        busy: false,
        highFiUrl: null,
        validationOk: null,
    });

    const dirtyRef = useRef(false);
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
        setPreflightProfile(selectedProject.print_profile || 'dtf');
        dirtyRef.current = false;
        setPast([]);
        setFuture([]);
        setSelectedLayerId(null);
        setPanOffset({ x: 0, y: 0 });
        setInteractionMode('default');
        setActiveSide(getSidesForMerchandise(merch || '')[0] || 'Front');
        setEditorGarmentView('edit');
        setLayoutReplayToken((n) => n + 1);
    }, [selectedProjectId, selectedProject]);

    useEffect(() => {
        if (!token || !selectedProjectId) {
            return undefined;
        }
        const timer = setTimeout(() => {
            if (!dirtyRef.current) {
                return;
            }
            void (async () => {
                try {
                    const payload = mergeScratchForSave(selectedProject?.scratch_layout, layoutRef.current);
                    const res = await saveScratchLayout(token, selectedProjectId, payload);
                    dirtyRef.current = false;
                    if (res?.project?.scratch_layout) {
                        onProjectFieldsUpdate?.(selectedProjectId, { scratch_layout: res.project.scratch_layout });
                    }
                } catch {
                    /* keep dirtyRef true for a later attempt */
                }
            })();
        }, 12000);
        return () => clearTimeout(timer);
    }, [layout, token, selectedProjectId, selectedProject?.scratch_layout, onProjectFieldsUpdate]);

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

    useEffect(() => {
        if (adjustGarmentBackground) {
            setEditorGarmentView('edit');
        }
    }, [adjustGarmentBackground]);

    useEffect(() => {
        if (saveWizardOpen) {
            setEditorGarmentView('edit');
        }
    }, [saveWizardOpen]);

    const commitLayout = useCallback((nextOrFn, opts = {}) => {
        const { skipHistory = false } = opts;
        const current = layoutRef.current;
        const next = typeof nextOrFn === 'function' ? nextOrFn(current) : nextOrFn;
        if (next === current) {
            return;
        }
        dirtyRef.current = true;
        if (!skipHistory) {
            setPast((p) => [...p.slice(-(UNDO_DEPTH - 1)), cloneLayout(current)]);
            setFuture([]);
        }
        layoutRef.current = next;
        setLayout(next);
    }, []);

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        setPast((p) => p.slice(0, -1));
        setFuture((f) => [cloneLayout(layoutRef.current), ...f]);
        dirtyRef.current = true;
        layoutRef.current = prev;
        setLayout(prev);
        setLayoutReplayToken((n) => n + 1);
        setStatusMessage('Undo.');
    }, [past]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const [next, ...rest] = future;
        setFuture(rest);
        setPast((p) => [...p, cloneLayout(layoutRef.current)]);
        dirtyRef.current = true;
        layoutRef.current = next;
        setLayout(next);
        setLayoutReplayToken((n) => n + 1);
        setStatusMessage('Redo.');
    }, [future]);

    const layersForSide = useMemo(() => layout?.sides?.[activeSide]?.layers ?? [], [layout, activeSide]);

    const handleFabricPersist = useCallback(
        (fabricJson, legacyLayers) => {
            commitLayout(
                (cur) => {
                    const next = cloneLayout(cur);
                    const sideData = next.sides?.[activeSide] || { layers: [] };
                    const layers = Array.isArray(legacyLayers) ? legacyLayers : Array.isArray(sideData.layers) ? sideData.layers : [];
                    next.sides[activeSide] = { ...sideData, layers, fabric: fabricJson };
                    return next;
                },
                { skipHistory: true }
            );
        },
        [activeSide, commitLayout]
    );

    const handleSelectLayerFromPanel = useCallback((id) => {
        setSelectedLayerId(id);
        if (id) {
            fabricApiRef.current?.selectLayerById?.(id);
        } else {
            fabricApiRef.current?.clearFabricSelection?.();
        }
    }, []);

    const addImageFromSrc = useCallback((src) => {
        if (!src) return;
        fabricApiRef.current?.addImageFromUrl?.(src);
        setStatusMessage('Image added to canvas.');
    }, []);

    const handleUploadImageFile = useCallback(
        (file) => {
            if (!file?.type?.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    const src = reader.result;
                    addImageFromSrc(src);
                    const entry = {
                        id: `lib_${Date.now()}`,
                        name: file.name || 'Upload',
                        src,
                        addedAt: new Date().toISOString(),
                    };
                    setUserLibrary((prev) => {
                        const deduped = prev.filter((x) => x.src !== src);
                        const next = [entry, ...deduped].slice(0, 200);
                        saveUserImageLibrary(next);
                        return next;
                    });
                    setStatusMessage('Image added and saved to My Library.');
                }
            };
            reader.readAsDataURL(file);
        },
        [addImageFromSrc]
    );

    const handleRemoveUserLibraryImage = useCallback((id) => {
        if (!id) return;
        setUserLibrary((prev) => {
            const next = prev.filter((x) => x.id !== id);
            saveUserImageLibrary(next);
            return next;
        });
        setStatusMessage('Removed from My Library.');
        onNotify?.('Image removed from My Library.', 'success');
    }, [onNotify]);

    const handleAddTextBlock = useCallback(() => {
        fabricApiRef.current?.addText?.(selectedFont?.family);
        setStatusMessage('Text block added.');
    }, [selectedFont]);

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

    const handleSelectTemplate = useCallback(async (template) => {
        setSelectedTemplate(template);
        if (template?.userSaved && template.fabric && typeof template.fabric === 'object') {
            await fabricApiRef.current?.loadFromJSON?.(template.fabric);
            setStatusMessage(`Template applied: ${template.name}`);
            return;
        }
        if (template?.userSaved && Array.isArray(template.layers)) {
            await fabricApiRef.current?.importLegacyLayers?.(template.layers);
            setStatusMessage(`Template applied: ${template.name}`);
            return;
        }
        await fabricApiRef.current?.importLegacyLayers?.(templateToLayers(template));
        setStatusMessage(`Template applied: ${template.name}`);
    }, []);

    const handleSaveUserTemplate = useCallback(
        (name) => {
            const trimmed = String(name || '').trim();
            if (!trimmed) {
                setStatusMessage('Enter a template name to save.');
                return;
            }
            fabricApiRef.current?.flush?.();
            const fabric = fabricApiRef.current?.getFabricJson?.();
            const objects = fabric?.objects;
            if (!Array.isArray(objects) || objects.length === 0) {
                setStatusMessage('Add at least one object on the canvas before saving.');
                return;
            }
            const entry = {
                id: `user_tpl_${Date.now()}`,
                name: trimmed,
                userSaved: true,
                fabric: structuredClone(fabric),
            };
            const next = [...userTemplates, entry];
            setUserTemplates(next);
            saveUserTemplates(next);
            setStatusMessage(`Saved template “${trimmed}” for reuse.`);
            onNotify?.('Template saved in this browser.', 'success');
        },
        [userTemplates, onNotify]
    );

    const handleSelectFont = useCallback(
        (font) => {
            setSelectedFont(font);
            if (!selectedLayerId) {
                setStatusMessage(`Font "${font.name}" will be used for the next text block.`);
                return;
            }
            const target = (layoutRef.current.sides?.[activeSide]?.layers || []).find((l) => l.id === selectedLayerId);
            if (target?.type === 'text') {
                fabricApiRef.current?.updateTextLayer?.(selectedLayerId, {
                    fontFamily: font.family || 'sans-serif',
                });
                setStatusMessage(`Font applied: ${font.name}`);
            } else {
                setStatusMessage(`Font "${font.name}" will be used for the next text block.`);
            }
        },
        [activeSide, selectedLayerId]
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

    const handleLayerReorderDrag = useCallback((orderedIdsBottomToTop) => {
        if (!Array.isArray(orderedIdsBottomToTop) || orderedIdsBottomToTop.length === 0) return;
        fabricApiRef.current?.reorderLayersByIds?.(orderedIdsBottomToTop);
        setStatusMessage('Layer order updated.');
    }, []);

    const handleLayerDelete = useCallback((layerId) => {
        if (fabricApiRef.current?.removeLayerById?.(layerId)) {
            setSelectedLayerId((id) => (id === layerId ? null : id));
            setStatusMessage('Layer removed.');
        }
    }, []);

    const handleLayerToggleLock = useCallback(
        (layerId) => {
            const target = layersForSide.find((l) => l.id === layerId);
            if (!target) return;
            fabricApiRef.current?.setLayerLocked?.(layerId, !target.locked);
            setStatusMessage('Layer lock updated.');
        },
        [layersForSide]
    );

    const handleLayerToggleHide = useCallback(
        (layerId) => {
            const target = layersForSide.find((l) => l.id === layerId);
            if (!target) return;
            fabricApiRef.current?.setLayerHidden?.(layerId, !target.hidden);
            setStatusMessage('Layer visibility updated.');
        },
        [layersForSide]
    );

    useEffect(() => {
        function onKeyDown(event) {
            const target = event.target;
            const tag = target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

            const layer = layersForSide.find((l) => l.id === selectedLayerId);
            const nudgeKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (selectedLayerId && nudgeKeys.includes(event.key)) {
                if (!layer || layer.locked || layer.hidden) return;
                const px = event.shiftKey ? 6 : 2;
                let dx = 0;
                let dy = 0;
                if (event.key === 'ArrowLeft') dx = -px;
                if (event.key === 'ArrowRight') dx = px;
                if (event.key === 'ArrowUp') dy = -px;
                if (event.key === 'ArrowDown') dy = px;
                if (fabricApiRef.current?.nudgeActive?.(dx, dy)) {
                    event.preventDefault();
                }
                return;
            }

            if (event.key === 'Backspace' || event.key === 'Delete') {
                if (fabricApiRef.current?.deleteActiveSelection?.()) {
                    event.preventDefault();
                    return;
                }
            }

            if (!selectedLayerId) return;
            if (event.key !== 'Backspace' && event.key !== 'Delete') return;
            if (layer?.locked) return;
            event.preventDefault();
            handleLayerDelete(selectedLayerId);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedLayerId, handleLayerDelete, layersForSide]);

    const handleUpdateTextLayer = useCallback((layerId, patch) => {
        fabricApiRef.current?.updateTextLayer?.(layerId, patch);
    }, []);

    const handleUpdateLayerTransform = useCallback(
        (layerId, transformPatch) => {
            dirtyRef.current = true;
            setLayout((current) => updateLayerTransformOnSide(current, activeSide, layerId, transformPatch));
        },
        [activeSide]
    );

    const handleLayoutSavedFromWizard = useCallback(
        (scratch) => {
            onProjectFieldsUpdate?.(selectedProjectId, { scratch_layout: scratch });
        },
        [onProjectFieldsUpdate, selectedProjectId]
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
                ...mergeScratchForSave(selectedProject?.scratch_layout, layoutRef.current),
                template: selectedTemplate?.id ?? null,
                font: selectedFont?.id ?? null,
                image: selectedImage?.id ?? null,
            };
            const res = await saveScratchLayout(token, selectedProjectId, payload);
            if (res?.project) {
                onProjectFieldsUpdate?.(selectedProjectId, {
                    scratch_layout: res.project.scratch_layout,
                    print_profile: res.project.print_profile,
                    preflight_report: res.project.preflight_report,
                });
            }
            dirtyRef.current = false;
            setStatusMessage('Design saved.');
            onNotify?.('Design saved successfully.', 'success');
        } catch (error) {
            setErrorMessage(error.message);
            onNotify?.(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    const runPrintAnalysis = useCallback(
        async (opts = {}) => {
            const { openReadinessTab = false } = opts;
            if (!selectedProjectId) {
                setErrorMessage('No project selected.');
                return;
            }
            if (openReadinessTab) {
                setActiveTool('preflight');
            }
            setErrorMessage('');
            fabricApiRef.current?.flush?.();
            setPreflightLoading(true);
            try {
                const merged = mergeScratchForSave(selectedProject?.scratch_layout, layoutRef.current);
                const res = await runProjectPreflight(token, selectedProjectId, {
                    print_profile: preflightProfile,
                    layout: merged,
                });
                if (res?.preflight && res?.project) {
                    onProjectFieldsUpdate?.(selectedProjectId, {
                        preflight_report: res.preflight,
                        print_profile: res.project.print_profile,
                        scratch_layout: res.project.scratch_layout,
                    });
                    const st = res.preflight?.status;
                    setFabricPrintPipeline((prev) => ({
                        ...prev,
                        validationOk: st === 'error' ? false : st === 'ok' || st === 'warning' ? true : null,
                    }));
                }
                setStatusMessage('Print analysis complete.');
                onNotify?.('Print readiness updated.', 'success');
            } catch (error) {
                setFabricPrintPipeline((prev) => ({ ...prev, validationOk: false }));
                setErrorMessage(error.message);
                onNotify?.(error.message, 'error');
            } finally {
                setPreflightLoading(false);
            }
        },
        [selectedProjectId, selectedProject, token, preflightProfile, onProjectFieldsUpdate, onNotify]
    );

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

                    <div className="hidden shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-600 dark:bg-gray-800 sm:flex">
                        <button
                            type="button"
                            title="Edit — flat garment template"
                            disabled={!selectedProjectId}
                            onClick={() => setEditorGarmentView('edit')}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                editorGarmentView === 'edit'
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                        </button>
                        <button
                            type="button"
                            title="Preview — mockup view (read-only)"
                            disabled={!selectedProjectId}
                            onClick={() => setEditorGarmentView('preview')}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                editorGarmentView === 'preview'
                                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                        >
                            <Scan className="h-3.5 w-3.5" />
                            Preview
                        </button>
                    </div>

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
                    userTemplates={userTemplates}
                    fonts={fonts}
                    stockImages={stockImages}
                    userLibraryImages={userLibrary}
                    onSelectTemplate={handleSelectTemplate}
                    onSelectFont={handleSelectFont}
                    onSelectImage={handleSelectImage}
                    onUploadImageFile={handleUploadImageFile}
                    onAddTextBlock={handleAddTextBlock}
                    onSaveUserTemplate={handleSaveUserTemplate}
                    productBaseColor={layout.productBaseColor}
                    onProductColorChange={handleProductColorChange}
                    activeSide={activeSide}
                    layers={layersForSide}
                    selectedLayerId={selectedLayerId}
                    onSelectLayer={handleSelectLayerFromPanel}
                    onLayerReorderDrag={handleLayerReorderDrag}
                    onLayerDelete={handleLayerDelete}
                    onLayerToggleLock={handleLayerToggleLock}
                    onLayerToggleHide={handleLayerToggleHide}
                    onUpdateTextLayer={handleUpdateTextLayer}
                    productGarmentBackgroundSrc={layout.productGarmentBackgroundSrc}
                    productGarmentBackgroundPresetKey={layout.productGarmentBackgroundPresetKey}
                    adjustGarmentBackground={adjustGarmentBackground}
                    onAdjustGarmentBackgroundChange={setAdjustGarmentBackground}
                    onProductGarmentBackgroundPreset={handleProductGarmentBackgroundPreset}
                    onProductGarmentBackgroundFile={handleProductGarmentBackgroundFile}
                    onProductGarmentBackgroundClear={handleProductGarmentBackgroundClear}
                    printProfile={preflightProfile}
                    onPrintProfileChange={setPreflightProfile}
                    onRunPreflight={() => void runPrintAnalysis({ openReadinessTab: false })}
                    onRemoveUserLibraryImage={handleRemoveUserLibraryImage}
                    preflightLoading={preflightLoading}
                    preflightReport={selectedProject?.preflight_report}
                />

                <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#8f8f8f] dark:bg-[#18181b]">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                            <FabricMerchEditor
                                key={`fabric-${activeSide}-${layoutReplayToken}`}
                                ref={fabricApiRef}
                                activeSide={activeSide}
                                zoom={zoom}
                                merchandise={merchandise}
                                productBaseColor={layout.productBaseColor}
                                productGarmentBackgroundSrc={layout.productGarmentBackgroundSrc}
                                productGarmentBackgroundPosition={layout.productGarmentBackgroundPosition}
                                onGarmentBackgroundPositionChange={handleGarmentBackgroundPositionChange}
                                adjustGarmentBackground={adjustGarmentBackground}
                                interactionMode={interactionMode}
                                panOffset={panOffset}
                                onPanOffsetChange={setPanOffset}
                                initialFabric={layout.sides?.[activeSide]?.fabric ?? null}
                                onPersist={handleFabricPersist}
                                onSelectionChange={setSelectedLayerId}
                                token={token}
                                projectId={selectedProjectId}
                                onNotify={onNotify}
                                onPrintPipelineStateChange={setFabricPrintPipeline}
                                disabled={!selectedProjectId}
                                viewMode={editorGarmentView === 'edit' ? 'edit' : 'preview'}
                            />
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-gray-200/80 bg-white/90 px-4 py-2 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/90">
                        {productSides.map((side) => (
                            <button
                                key={side}
                                type="button"
                                onClick={() => {
                                    fabricApiRef.current?.flush?.();
                                    setActiveSide(side);
                                }}
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
                            highFidelityPrompt={highFidelityPrompt}
                            onHighFidelityPromptChange={setHighFidelityPrompt}
                            disabled={loading}
                            printPipelineBusy={fabricPrintPipeline.busy}
                            printPipelineHighFiUrl={fabricPrintPipeline.highFiUrl}
                            printPipelineValidationOk={fabricPrintPipeline.validationOk}
                            fabricActionsDisabled={!selectedProjectId}
                            onExportCanvasJson={() => fabricApiRef.current?.exportCanvasJson?.()}
                            onExportPngPreview={() => fabricApiRef.current?.exportPngPreview?.()}
                            onRunHighFidelity={() => void fabricApiRef.current?.runHighFidelity?.(highFidelityPrompt.trim())}
                            onValidatePrintRules={() => void runPrintAnalysis({ openReadinessTab: true })}
                            onExportFinalPng={() => fabricApiRef.current?.exportFinalPng?.()}
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
