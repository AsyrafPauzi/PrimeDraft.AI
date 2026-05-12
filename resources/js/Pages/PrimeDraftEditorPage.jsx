import React, { useState } from 'react';
import { AssetLibraryPanel } from '../Components/Editor/AssetLibraryPanel';
import { CanvasWorkspace } from '../Components/Editor/CanvasWorkspace';
import { AiControlPanel } from '../Components/AIPanel/AiControlPanel';

export function PrimeDraftEditorPage() {
    const [splitPreview, setSplitPreview] = useState(true);
    const [highFidelityPrompt, setHighFidelityPrompt] = useState('Sample prompt for high-fidelity demo');

    return (
        <main className="min-h-screen bg-white text-gray-900">
            <header className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
                <h1 className="text-lg font-semibold">PrimeDraft.AI Editor</h1>
                <button
                    onClick={() => setSplitPreview((current) => !current)}
                    className="rounded border border-gray-400 px-3 py-1 text-sm"
                    type="button"
                >
                    {splitPreview ? 'Hide canvas split rail' : 'Show canvas split rail'}
                </button>
            </header>
            <section className="grid min-h-[calc(100vh-57px)] grid-cols-1 md:grid-cols-[260px_1fr_280px]">
                <AssetLibraryPanel />
                <div className="flex min-h-0 min-w-0 flex-col border-x border-gray-200 md:flex-row dark:border-gray-700">
                    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
                        <CanvasWorkspace />
                    </div>
                    {splitPreview ? (
                        <aside
                            className="w-full shrink-0 border-t border-gray-200 bg-gray-50 p-3 text-sm md:w-52 md:border-l md:border-t-0 dark:border-gray-700 dark:bg-gray-900/50"
                            aria-label="AI preview panel"
                        >
                            <p className="font-medium text-gray-800 dark:text-gray-100">Canvas split rail</p>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                In the full editor, the AI preview opens beside the garment with a spinner while images
                                generate.
                            </p>
                        </aside>
                    ) : null}
                </div>
                <AiControlPanel
                    highFidelityPrompt={highFidelityPrompt}
                    onHighFidelityPromptChange={setHighFidelityPrompt}
                    onExportCanvasJson={() => window.alert('Demo: export canvas JSON in the full editor')}
                    onExportPngPreview={() => window.alert('Demo: export PNG preview in the full editor')}
                    onRunHighFidelity={() => window.alert('Demo: AI high fidelity in the full editor')}
                    onValidatePrintRules={() => window.alert('Demo: validate print rules in the full editor')}
                    onExportFinalPng={() => window.alert('Demo: export final PNG in the full editor')}
                    disabled={false}
                />
            </section>
        </main>
    );
}
