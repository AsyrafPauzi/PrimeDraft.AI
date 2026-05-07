import React, { useRef } from 'react';
import { Upload, Wand2, Type, Library, Image, LayoutTemplate, Layers, Palette } from 'lucide-react';
import garmentBgPresets from '../../data/editor/garment-background-presets.json';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { sortLayers } from '../../lib/editorLayout';

const TOOLS = [
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'ai', icon: Wand2, label: 'AI' },
    { id: 'text', icon: Type, label: 'Add text' },
    { id: 'library', icon: Library, label: 'My library' },
    { id: 'graphics', icon: Image, label: 'Graphics' },
    { id: 'templates', icon: LayoutTemplate, label: 'My templates' },
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'colors', icon: Palette, label: 'Colors' },
];

const PRODUCT_SWATCHES = ['#ffffff', '#f5f5f0', '#1a1a1a', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea'];

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
    fonts = [],
    stockImages = [],
    onSelectTemplate,
    onSelectFont,
    onSelectImage,
    onUploadImageFile,
    onAddTextBlock,
    productBaseColor = '#ffffff',
    onProductColorChange,
    activeSide,
    layers = [],
    selectedLayerId,
    onSelectLayer,
    onLayerReorder,
    onLayerDelete,
    onUpdateTextLayer,
    productGarmentBackgroundSrc,
    productGarmentBackgroundPresetKey,
    adjustGarmentBackground = false,
    onAdjustGarmentBackgroundChange,
    onProductGarmentBackgroundPreset,
    onProductGarmentBackgroundFile,
    onProductGarmentBackgroundClear,
}) {
    const fileInputRef = useRef(null);
    const garmentBgFileRef = useRef(null);
    const sorted = sortLayers(layers);
    const selected = sorted.find((l) => l.id === selectedLayerId) || null;

    if (!activeTool) {
        return null;
    }

    return (
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
                            if (f) onUploadImageFile?.(f);
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
                    <p className="text-xs text-gray-400">Images are added on the active view ({activeSide}) anywhere on the garment.</p>
                </div>
            ) : null}

            {activeTool === 'text' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Add Text</h3>
                    <button
                        type="button"
                        onClick={() => onAddTextBlock?.()}
                        className="flex w-full items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
                    >
                        + Add a text block
                    </button>
                    <div className="mt-2">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Fonts (apply to selected text)</p>
                        {selected?.type === 'text' ? (
                            <div className="mb-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                                <Label className="text-xs">Selected text</Label>
                                <Input
                                    value={selected.props?.text ?? ''}
                                    onChange={(e) => onUpdateTextLayer?.(selected.id, { text: e.target.value })}
                                    className="mt-1 h-9 text-sm"
                                />
                                <p className="mt-1 text-[10px] text-gray-400">Pick a font below to apply it immediately.</p>
                            </div>
                        ) : (
                            <p className="mb-2 text-[10px] text-gray-400">Select a text layer first, or choose a font for the next text block.</p>
                        )}
                        <ul className="space-y-1.5">
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
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">My Templates</h3>
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
                </div>
            ) : null}

            {activeTool === 'graphics' || activeTool === 'library' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {activeTool === 'library' ? 'My Library' : 'Graphics'}
                    </h3>
                    <p className="text-xs text-gray-500">
                        Drag onto the garment preview or click to add. Layers can span the entire front, back, or sleeve face.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
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
                                className="flex h-20 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-cyan-500/40"
                            >
                                <Image className="mb-1 h-6 w-6 text-gray-300 dark:text-gray-600" />
                                <span className="line-clamp-2 text-center text-[10px]">{image.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}

            {activeTool === 'ai' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Generate</h3>
                    <p className="text-xs text-gray-500">Use the AI panel on the right to generate designs with prompts.</p>
                    <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:from-indigo-900/20 dark:to-purple-900/20">
                        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            Tip: Be specific about colors, style, and theme for better results.
                        </p>
                    </div>
                </div>
            ) : null}

            {activeTool === 'layers' ? (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Layers · {activeSide}</h3>
                    {sorted.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
                            <Layers className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                            <p className="text-xs text-gray-400">No layers on this side yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {[...sorted].reverse().map((layer) => (
                                <li
                                    key={layer.id}
                                    className={`rounded-lg border p-2 text-xs ${
                                        selectedLayerId === layer.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:border-cyan-500 dark:bg-cyan-500/10'
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <button type="button" className="w-full text-left font-medium" onClick={() => onSelectLayer?.(layer.id)}>
                                        {layer.type === 'text' ? `Text: ${(layer.props?.text || '').slice(0, 24)}` : null}
                                        {layer.type === 'image' || layer.type === 'graphicRef' ? 'Image' : null}
                                        {!['text', 'image', 'graphicRef'].includes(layer.type) ? layer.type : null}
                                    </button>
                                    <div className="mt-1 flex gap-1">
                                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => onLayerReorder?.(layer.id, 'up')}>
                                            Up
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => onLayerReorder?.(layer.id, 'down')}>
                                            Down
                                        </Button>
                                        <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => onLayerDelete?.(layer.id)}>
                                            Del
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {selected && selected.type === 'text' ? (
                        <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                            <Label className="text-xs">Text</Label>
                            <Input
                                value={selected.props?.text ?? ''}
                                onChange={(e) => onUpdateTextLayer?.(selected.id, { text: e.target.value })}
                                className="h-9 text-sm"
                            />
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
                    ) : null}
                </div>
            ) : null}

            {activeTool === 'colors' ? (
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Product base color</h3>
                        <p className="mt-0.5 text-xs text-gray-500">Tint on top of texture or garment (works with presets below).</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {PRODUCT_SWATCHES.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    title={color}
                                    onClick={() => onProductColorChange?.(color)}
                                    className={`h-8 w-8 rounded-full border-2 shadow hover:scale-110 dark:border-gray-800 ${
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
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Garment background</h3>
                        <p className="mt-0.5 text-xs text-gray-500">Texture fills the shirt (masked). Combine with tint above.</p>
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
                            {garmentBgPresets.map((preset) => {
                                const isActive = preset.id === productGarmentBackgroundPresetKey && Boolean(productGarmentBackgroundSrc?.trim?.());
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        title={preset.label}
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
    );
}
