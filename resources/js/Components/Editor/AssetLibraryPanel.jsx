import React, { useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
    Upload,
    Type,
    Library,
    Image,
    LayoutTemplate,
    Layers,
    Palette,
    ShieldCheck,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    Bold,
    Italic,
    Underline,
    GripVertical,
    Trash2,
} from 'lucide-react';
import garmentBgPresets from '../../data/editor/garment-background-presets.json';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { sortLayers } from '../../lib/editorLayout';

const TOOLS = [
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'text', icon: Type, label: 'Add text' },
    { id: 'library', icon: Library, label: 'My library' },
    { id: 'graphics', icon: Image, label: 'Graphics' },
    { id: 'templates', icon: LayoutTemplate, label: 'My templates' },
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'preflight', icon: ShieldCheck, label: 'Print readiness' },
    { id: 'colors', icon: Palette, label: 'Colors' },
];

const PRODUCT_SWATCHES = [
    '#ffffff',
    '#f8fafc',
    '#f1f5f9',
    '#e2e8f0',
    '#cbd5e1',
    '#94a3b8',
    '#64748b',
    '#475569',
    '#334155',
    '#1e293b',
    '#0f172a',
    '#000000',
    '#fef2f2',
    '#fecaca',
    '#f87171',
    '#dc2626',
    '#991b1b',
    '#fff7ed',
    '#fdba74',
    '#ea580c',
    '#9a3412',
    '#fefce8',
    '#fde047',
    '#ca8a04',
    '#fef9c3',
    '#84cc16',
    '#16a34a',
    '#14532d',
    '#ecfdf5',
    '#34d399',
    '#059669',
    '#064e3b',
    '#e0f2fe',
    '#38bdf8',
    '#0284c7',
    '#1e3a8a',
    '#ede9fe',
    '#a78bfa',
    '#7c3aed',
    '#4c1d95',
    '#fce7f3',
    '#f472b6',
    '#db2777',
    '#831843',
    '#fdf4ff',
    '#e879f9',
    '#a21caf',
];

/** Bold / italic / underline + size + color — used from “Add text” and “Layers” tools. */
function TextFormatToolbar({ selected, onUpdateTextLayer }) {
    if (!selected || selected.type !== 'text') {
        return null;
    }
    return (
        <div className="space-y-2">
            <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
                <Button
                    type="button"
                    size="sm"
                    variant={Number(selected.props?.fontWeight) >= 700 ? 'default' : 'outline'}
                    className="h-8 flex-1 px-0"
                    title="Bold"
                    onClick={() =>
                        onUpdateTextLayer?.(selected.id, {
                            fontWeight: Number(selected.props?.fontWeight) >= 700 ? '400' : '700',
                        })
                    }
                >
                    <Bold className="mx-auto h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={selected.props?.fontStyle === 'italic' ? 'default' : 'outline'}
                    className="h-8 flex-1 px-0"
                    title="Italic"
                    onClick={() =>
                        onUpdateTextLayer?.(selected.id, {
                            fontStyle: selected.props?.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                    }
                >
                    <Italic className="mx-auto h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={selected.props?.textDecoration === 'underline' ? 'default' : 'outline'}
                    className="h-8 flex-1 px-0"
                    title="Underline"
                    onClick={() =>
                        onUpdateTextLayer?.(selected.id, {
                            textDecoration: selected.props?.textDecoration === 'underline' ? 'none' : 'underline',
                        })
                    }
                >
                    <Underline className="mx-auto h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2">
                <Label className="text-xs">Size (px)</Label>
                <Input
                    type="number"
                    min={8}
                    max={120}
                    value={selected.props?.fontSizePx ?? 16}
                    onChange={(e) =>
                        onUpdateTextLayer?.(selected.id, { fontSizePx: Math.min(120, Math.max(8, parseInt(e.target.value, 10) || 16)) })
                    }
                    className="h-9 text-sm"
                />
                <Label className="text-xs">Color</Label>
                <Input
                    type="color"
                    value={selected.props?.color || '#111827'}
                    onChange={(e) => onUpdateTextLayer?.(selected.id, { color: e.target.value })}
                    className="h-9 w-full"
                />
            </div>
        </div>
    );
}

export function AssetLibraryPanel({
    templates = [],
    fonts = [],
    stockImages = [],
    activeTool,
    onToolSelect,
}) {
    return (
        <aside className="flex w-[68px] flex-col items-center border-r border-gray-200 bg-white pt-2 dark:border-gray-700 dark:bg-gray-900">
            {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                    <button
                        key={tool.id}
                        type="button"
                        onClick={() => onToolSelect?.(isActive ? null : tool.id)}
                        title={tool.label}
                        className={`flex w-full flex-col items-center gap-1 px-1 py-3 transition-colors ${
                            isActive
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-500/20 dark:text-cyan-300'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="text-center text-[9.5px] leading-tight">{tool.label}</span>
                    </button>
                );
            })}
        </aside>
    );
}

export function ToolContentPanel({
    activeTool,
    templates = [],
    userTemplates = [],
    fonts = [],
    stockImages = [],
    userLibraryImages = [],
    onSelectTemplate,
    onSelectFont,
    onSelectImage,
    onUploadImageFile,
    onProductGarmentBackgroundFile,
    onAddTextBlock,
    onSaveUserTemplate,
    productBaseColor = '#ffffff',
    onProductColorChange,
    activeSide,
    layers = [],
    selectedLayerId,
    onSelectLayer,
    onLayerReorderDrag,
    onLayerDelete,
    onLayerToggleLock,
    onLayerToggleHide,
    onUpdateTextLayer,
    productGarmentBackgroundSrc,
    productGarmentBackgroundPresetKey,
    adjustGarmentBackground = false,
    onAdjustGarmentBackgroundChange,
    onProductGarmentBackgroundPreset,
    onProductGarmentBackgroundClear,
    printProfile = 'dtf',
    onPrintProfileChange,
    onRunPreflight,
    onRemoveUserLibraryImage,
    preflightLoading = false,
    preflightReport = null,
}) {
    const fileInputRef = useRef(null);
    const garmentBgFileRef = useRef(null);
    const [templateNameDraft, setTemplateNameDraft] = useState('');
    const [uploadAlsoGarmentBackground, setUploadAlsoGarmentBackground] = useState(false);
    const [libraryDeleteId, setLibraryDeleteId] = useState(null);

    const uniqueGarmentBgPresets = useMemo(() => {
        const seen = new Set();
        const out = [];
        for (const p of garmentBgPresets) {
            const src = p?.src;
            if (!src || seen.has(src)) continue;
            seen.add(src);
            out.push(p);
        }
        return out;
    }, []);

    const activeGarmentPresetSrc = useMemo(() => {
        if (!productGarmentBackgroundPresetKey) return null;
        return garmentBgPresets.find((p) => p.id === productGarmentBackgroundPresetKey)?.src ?? null;
    }, [productGarmentBackgroundPresetKey]);

    const sorted = sortLayers(layers);
    const selected = sorted.find((l) => l.id === selectedLayerId) || null;
    const visualLayerOrder = [...sorted].reverse();

    if (!activeTool) {
        return null;
    }

    const pendingLibraryName = userLibraryImages.find((img) => img.id === libraryDeleteId)?.name || 'this image';

    return (
        <>
        <aside className="w-64 overflow-y-auto border-r border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            {selected ? (
                <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-xs dark:border-cyan-500/30 dark:bg-cyan-500/10">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left font-semibold text-indigo-800 dark:text-cyan-200"
                            onClick={() => onSelectLayer?.(selected.id)}
                        >
                            Selected: {selected.type === 'text' ? selected.props?.text || 'Text' : selected.type === 'image' || selected.type === 'graphicRef' ? 'Image' : selected.type}
                        </button>
                        <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-7 shrink-0 px-2 text-[10px]"
                            onClick={() => onLayerDelete?.(selected.id)}
                        >
                            Remove
                        </Button>
                    </div>
                    <p className="mt-1 text-[10px] text-indigo-600 dark:text-cyan-300">Tip: select any layer on the canvas, then remove it here or press Delete.</p>
                </div>
            ) : null}

            {activeTool === 'upload' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Upload Image</h3>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                                onUploadImageFile?.(f);
                                if (uploadAlsoGarmentBackground) {
                                    onProductGarmentBackgroundFile?.(f);
                                }
                            }
                            e.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                    >
                        <Upload className="mb-2 h-6 w-6 text-gray-400" />
                        <p className="text-xs text-gray-500">Click to upload</p>
                        <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG</p>
                    </button>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-2 text-xs dark:border-gray-600 dark:bg-gray-800/50">
                        <input
                            type="checkbox"
                            checked={uploadAlsoGarmentBackground}
                            onChange={(e) => setUploadAlsoGarmentBackground(e.target.checked)}
                            className="mt-0.5"
                        />
                        <span className="text-gray-600 dark:text-gray-300">
                            Also apply as <span className="font-medium">garment background</span> texture (Colors panel). Same file is used for the canvas layer and the shirt texture.
                        </span>
                    </label>
                    <p className="text-xs text-gray-400">Images are added on the active view ({activeSide}) anywhere on the garment.</p>
                </div>
            ) : null}

            {activeTool === 'text' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add Text</h3>
                    <p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                        Double-click text on the shirt to edit in place. Here: fonts, weight, and size.
                    </p>
                    <button
                        type="button"
                        onClick={() => onAddTextBlock?.()}
                        className="flex w-full items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
                    >
                        + Add a text block
                    </button>
                    <TextFormatToolbar selected={selected} onUpdateTextLayer={onUpdateTextLayer} />
                    <div className="mt-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Fonts</p>
                        <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                            {fonts.map((font) => (
                                <li key={font.id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelectFont?.(font)}
                                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                            selected?.type === 'text' && selected.props?.fontFamily === font.family
                                                ? 'border-indigo-500 bg-indigo-50 dark:border-cyan-500 dark:bg-cyan-500/10'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <span style={{ fontFamily: font.family || 'sans-serif' }}>{font.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : null}

            {activeTool === 'templates' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Templates</h3>
                    <p className="text-xs text-gray-500">Built-in layouts and your saved designs for this account (browser).</p>
                    <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-2 dark:border-gray-600">
                        <Label className="text-xs">Save current side ({activeSide}) as template</Label>
                        <Input
                            value={templateNameDraft}
                            onChange={(e) => setTemplateNameDraft(e.target.value)}
                            placeholder="e.g. Summer drop v2"
                            className="h-9 text-sm"
                        />
                        <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                const name = templateNameDraft.trim();
                                if (!name) return;
                                onSaveUserTemplate?.(name);
                                setTemplateNameDraft('');
                            }}
                        >
                            Save to My templates
                        </Button>
                    </div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Starter templates</p>
                    <ul className="space-y-1.5">
                        {templates.map((template) => (
                            <li key={template.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelectTemplate?.(template)}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                    <p className="font-medium text-gray-700 dark:text-gray-200">{template.name}</p>
                                    <p className="text-xs text-gray-400">{template.description || 'Blank template'}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {userTemplates.length > 0 ? (
                        <>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Your saved templates</p>
                            <ul className="space-y-1.5">
                                {userTemplates.map((template) => (
                                    <li key={template.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelectTemplate?.(template)}
                                            className="w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/15"
                                        >
                                            <p className="font-medium text-gray-800 dark:text-gray-100">{template.name}</p>
                                            <p className="text-xs text-gray-500">Saved layout · reuse on any project</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>
            ) : null}

            {activeTool === 'graphics' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Graphics</h3>
                    <p className="text-xs text-gray-500">Large sticker-style library — drag onto the shirt or click to add.</p>
                    <div className="grid max-h-[min(60vh,28rem)] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
                        {stockImages.map((image) => (
                            <button
                                key={image.id}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/x-primedraft-src', image.src || '');
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => onSelectImage?.(image)}
                                className="flex h-24 flex-col items-stretch gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-500/40"
                            >
                                <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded-md bg-white dark:bg-gray-900/80">
                                    <img
                                        src={image.src}
                                        alt=""
                                        className="max-h-full max-w-full object-contain"
                                        draggable={false}
                                    />
                                </span>
                                <span className="line-clamp-2 text-center text-[10px] text-gray-600 dark:text-gray-300">{image.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {activeTool === 'library' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Library</h3>
                    <p className="text-xs text-gray-500">Every image you upload from Upload is kept here for this browser so you can reuse it.</p>
                    {userLibraryImages.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-600">
                            No uploads yet — use Upload, then open My Library again.
                        </p>
                    ) : (
                        <div className="grid max-h-[min(60vh,28rem)] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
                            {userLibraryImages.map((image) => (
                                <div key={image.id} className="group relative">
                                    <button
                                        type="button"
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('application/x-primedraft-src', image.src || '');
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                        onClick={() => onSelectImage?.(image)}
                                        className="flex h-24 w-full flex-col items-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-left hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-500/40"
                                    >
                                        <img src={image.src} alt="" className="h-14 w-full object-cover" draggable={false} />
                                        <span className="line-clamp-2 px-1 py-1 text-center text-[9px] text-gray-600 dark:text-gray-300">{image.name}</span>
                                    </button>
                                    <button
                                        type="button"
                                        title="Remove from library"
                                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white/95 text-red-600 opacity-0 shadow-sm transition-opacity hover:bg-red-50 group-hover:opacity-100 dark:border-red-900/50 dark:bg-gray-900/95 dark:text-red-400 dark:hover:bg-red-950/40"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setLibraryDeleteId(image.id);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            {activeTool === 'layers' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Layers · {activeSide}</h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Drag the grip to reorder (top = in front on the shirt).</p>
                    {sorted.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
                            <Layers className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                            <p className="text-xs text-gray-400">No layers on this side yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {visualLayerOrder.map((layer) => (
                                <li
                                    key={layer.id}
                                    draggable={!layer.locked}
                                    onDragStart={(e) => {
                                        if (layer.locked) {
                                            e.preventDefault();
                                            return;
                                        }
                                        e.dataTransfer.setData('application/x-primedraft-layer', layer.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const fromId = e.dataTransfer.getData('application/x-primedraft-layer');
                                        if (!fromId || fromId === layer.id || layer.locked) return;
                                        const v = visualLayerOrder.map((l) => l.id);
                                        const fi = v.indexOf(fromId);
                                        const ti = v.indexOf(layer.id);
                                        if (fi < 0 || ti < 0) return;
                                        const nextV = [...v];
                                        nextV.splice(fi, 1);
                                        let ins = ti;
                                        if (fi < ti) ins -= 1;
                                        nextV.splice(ins, 0, fromId);
                                        const bottomToTop = nextV.slice().reverse();
                                        onLayerReorderDrag?.(bottomToTop);
                                    }}
                                    className={`rounded-lg border p-2 text-xs ${
                                        selectedLayerId === layer.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:border-cyan-500 dark:bg-cyan-500/10'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span
                                            className={`mt-0.5 shrink-0 text-gray-400 ${layer.locked ? 'cursor-not-allowed opacity-40' : 'cursor-grab active:cursor-grabbing'}`}
                                            title={layer.locked ? 'Locked' : 'Drag to reorder'}
                                        >
                                            <GripVertical className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <button type="button" className="w-full text-left font-medium" onClick={() => onSelectLayer?.(layer.id)}>
                                                {layer.type === 'text' ? `Text: ${(layer.props?.text || '').slice(0, 24)}` : null}
                                                {layer.type === 'image' || layer.type === 'graphicRef' ? 'Image' : null}
                                                {!['text', 'image', 'graphicRef'].includes(layer.type) ? layer.type : null}
                                            </button>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-[10px]"
                                                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                                                    onClick={() => onLayerToggleLock?.(layer.id)}
                                                >
                                                    {layer.locked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-[10px]"
                                                    title={layer.hidden ? 'Show on canvas' : 'Hide on canvas'}
                                                    onClick={() => onLayerToggleHide?.(layer.id)}
                                                >
                                                    {layer.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-7 px-2 text-[10px]"
                                                    disabled={layer.locked}
                                                    onClick={() => onLayerDelete?.(layer.id)}
                                                >
                                                    Del
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {selected?.type === 'text' ? (
                        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <p className="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-100">Text formatting</p>
                            <TextFormatToolbar selected={selected} onUpdateTextLayer={onUpdateTextLayer} />
                            <p className="mt-2 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                                Double-click text on the garment to edit wording on the canvas. Bold, italic, and underline apply to the whole text block.
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {activeTool === 'preflight' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Print readiness</h3>
                    <p className="text-xs text-gray-500">
                        Server-side checks for your current layout (saved or unsaved when you run analysis). Production checkout is blocked if status is error.
                    </p>
                    <div>
                        <Label className="text-xs">Print profile</Label>
                        <select
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                            value={printProfile}
                            onChange={(e) => onPrintProfileChange?.(e.target.value)}
                        >
                            <option value="dtf">DTF (flexible colors)</option>
                            <option value="screen">Screen print (max 6 colors)</option>
                            <option value="sublimation">Sublimation</option>
                        </select>
                    </div>
                    <Button type="button" className="w-full" disabled={preflightLoading} onClick={() => onRunPreflight?.()}>
                        {preflightLoading ? 'Analyzing…' : 'Run print analysis'}
                    </Button>
                    {preflightReport && typeof preflightReport === 'object' ? (
                        <div className="rounded-lg border border-gray-200 p-2 text-xs dark:border-gray-700">
                            <p className="font-semibold capitalize text-gray-800 dark:text-gray-100">Status: {preflightReport.status}</p>
                            <p className="mt-0.5 text-[10px] text-gray-500">Profile: {preflightReport.profile_label || preflightReport.profile}</p>
                            {Array.isArray(preflightReport.issues) && preflightReport.issues.length > 0 ? (
                                <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                                    {preflightReport.issues.map((issue, idx) => (
                                        <li
                                            key={`${issue.id || 'issue'}-${idx}`}
                                            className={`rounded border px-2 py-1 ${
                                                issue.severity === 'error'
                                                    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'
                                                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100'
                                            }`}
                                        >
                                            <span className="font-medium">{issue.severity}:</span> {issue.message}
                                            {issue.side ? (
                                                <span className="mt-0.5 block text-[10px] opacity-80">Side: {issue.side}</span>
                                            ) : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-2 text-emerald-700 dark:text-emerald-400">No issues reported for this profile.</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">Run analysis to see results.</p>
                    )}
                </div>
            ) : null}

            {activeTool === 'colors' ? (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Product base color</h3>
                        <p className="mt-0.5 text-xs text-gray-500">Tint on top of texture or garment (works with presets below).</p>
                        <div className="mt-2 flex max-h-48 flex-wrap content-start gap-1.5 overflow-y-auto">
                            {PRODUCT_SWATCHES.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    title={color}
                                    onClick={() => onProductColorChange?.(color)}
                                    className={`h-7 w-7 shrink-0 rounded-full border-2 shadow hover:scale-110 dark:border-gray-800 ${
                                        productBaseColor?.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-indigo-500 ring-offset-1' : 'border-white'
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <Label className="text-xs shrink-0">Custom</Label>
                            <Input type="color" value={productBaseColor} onChange={(e) => onProductColorChange?.(e.target.value)} className="h-9 w-full" />
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Garment background (factory-friendly)</h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Presets use subtle repeats and balanced contrast so previews behave closer to real DTF / screen /
                            sublimation separations — not photo‑real busy prints.
                        </p>
                        <input
                            ref={garmentBgFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onProductGarmentBackgroundFile?.(f);
                                e.target.value = '';
                            }}
                        />
                        <p className="mb-2 mt-2 text-[10px] font-medium uppercase tracking-wide text-gray-400">Presets</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {uniqueGarmentBgPresets.map((preset) => {
                                const trimmedBg = productGarmentBackgroundSrc?.trim?.();
                                const isActive =
                                    Boolean(trimmedBg) &&
                                    (preset.id === productGarmentBackgroundPresetKey ||
                                        (activeGarmentPresetSrc && preset.src === activeGarmentPresetSrc) ||
                                        (!productGarmentBackgroundPresetKey && preset.src === trimmedBg));
                                const tip = [preset.label, preset.factoryNote].filter(Boolean).join(' — ');
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        title={tip}
                                        onClick={() => onProductGarmentBackgroundPreset?.(preset)}
                                        className={`overflow-hidden rounded-lg border shadow-sm ring-offset-2 transition hover:opacity-95 ${
                                            isActive ? 'ring-2 ring-indigo-500 dark:ring-cyan-400' : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                    >
                                        <img
                                            src={preset.src}
                                            alt=""
                                            className="h-12 w-full object-cover"
                                            draggable={false}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-2 text-xs"
                                onClick={() => garmentBgFileRef.current?.click()}
                            >
                                <Upload className="h-3.5 w-3.5" />
                                Upload image
                            </Button>
                            {productGarmentBackgroundSrc?.trim?.() ? (
                                <Button type="button" variant="destructive" size="sm" className="h-8 w-full text-xs" onClick={() => onProductGarmentBackgroundClear?.()}>
                                    Clear background image
                                </Button>
                            ) : null}
                            {productGarmentBackgroundSrc?.trim?.() ? (
                                <button
                                    type="button"
                                    onClick={() => onAdjustGarmentBackgroundChange?.(!adjustGarmentBackground)}
                                    className={`rounded-lg border px-3 py-2 text-start text-xs font-medium transition-colors ${
                                        adjustGarmentBackground
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-cyan-500/50 dark:bg-cyan-500/15 dark:text-cyan-200'
                                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <span className="block font-semibold">Move background</span>
                                    <span className="mt-0.5 block font-normal text-gray-500 dark:text-gray-400">
                                        {adjustGarmentBackground ? 'Dragging on the shirt moves texture — tap again when done.' : 'Turn on, then drag on the garment to reposition.'}
                                    </span>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </aside>

        <Dialog.Root open={libraryDeleteId !== null} onOpenChange={(open) => !open && setLibraryDeleteId(null)}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <Dialog.Title className="text-sm font-semibold text-gray-900 dark:text-gray-100">Remove from My Library?</Dialog.Title>
                    <Dialog.Description className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Delete <span className="font-medium">{pendingLibraryName}</span> from this browser’s saved uploads. This does not remove layers already on the canvas.
                    </Dialog.Description>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setLibraryDeleteId(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                if (libraryDeleteId) onRemoveUserLibraryImage?.(libraryDeleteId);
                                setLibraryDeleteId(null);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
        </>
    );
}
