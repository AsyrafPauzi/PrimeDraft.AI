import React from 'react';
import { Wand2, Sparkles, RefreshCw, Download } from 'lucide-react';

export function AiControlPanel({
    prompt,
    onPromptChange,
    onGenerate,
    onGenerateSimilar,
    onEnhancePrompt,
    onDownloadHighRes,
    disabled = false,
}) {
    return (
        <aside className="flex w-72 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Wand2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Design</h2>
                        <p className="text-[10px] text-gray-400">Generate print-ready artwork</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <div className="space-y-1.5">
                    <label htmlFor="ai-prompt" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Describe your design
                    </label>
                    <textarea
                        id="ai-prompt"
                        className="min-h-28 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
                        placeholder="E.g. Minimalist mountain landscape, bold typography, blue and white..."
                        value={prompt}
                        onChange={(event) => onPromptChange(event.target.value)}
                    />
                </div>

                <button
                    type="button"
                    onClick={() => onEnhancePrompt?.(prompt)}
                    disabled={disabled || !prompt?.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300"
                >
                    <Sparkles className="h-4 w-4" />
                    Enhance Prompt
                </button>

                <button
                    type="button"
                    onClick={() => onGenerate?.(prompt)}
                    disabled={disabled || !prompt?.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2.5 text-sm font-semibold text-white shadow transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:from-indigo-500 dark:to-purple-500"
                >
                    <Wand2 className="h-4 w-4" />
                    Generate Design
                </button>

                <button
                    type="button"
                    onClick={() => onGenerateSimilar?.(prompt)}
                    disabled={disabled || !prompt?.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <RefreshCw className="h-4 w-4" />
                    Generate Similar
                </button>

                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                    <p className="mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        Export Print File
                    </p>
                    <p className="mb-3 text-[10px] text-emerald-600 dark:text-emerald-500">
                        360 DPI minimum · 6 colour separation
                    </p>
                    {onDownloadHighRes ? (
                        <button
                            type="button"
                            onClick={onDownloadHighRes}
                            disabled={disabled}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Download className="h-4 w-4" />
                            Download 360 DPI
                        </button>
                    ) : null}
                </div>

                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">AI Tips</p>
                    <ul className="space-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <li>• Specify a color palette for consistent branding</li>
                        <li>• Mention the design style (minimal, bold, vintage…)</li>
                        <li>• Include merchandise for context (T-shirt, mug…)</li>
                    </ul>
                </div>
            </div>
        </aside>
    );
}
