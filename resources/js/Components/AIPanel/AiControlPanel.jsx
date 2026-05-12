import React from 'react';
import { Download, FileJson, ImageIcon, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';

/**
 * AI side panel: high-fidelity prompt + canvas export / validate actions.
 */
export function AiControlPanel({
    highFidelityPrompt = '',
    onHighFidelityPromptChange,
    disabled = false,
    printPipelineBusy = false,
    printPipelineHighFiUrl = null,
    printPipelineValidationOk = null,
    onExportCanvasJson,
    onExportPngPreview,
    onRunHighFidelity,
    onValidatePrintRules,
    onExportFinalPng,
    fabricActionsDisabled = false,
}) {
    const hasHiFiPrompt = Boolean(highFidelityPrompt?.trim());
    const fabricOff = fabricActionsDisabled || disabled;

    return (
        <aside className="flex w-72 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                        <Wand2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Design</h2>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <div className="space-y-1.5">
                    <label htmlFor="ai-hifi-prompt" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Prompt for high-fidelity
                    </label>
                    <textarea
                        id="ai-hifi-prompt"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
                        placeholder="Describe the print look you want from the current canvas…"
                        value={highFidelityPrompt}
                        onChange={(e) => onHighFidelityPromptChange?.(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <button
                        type="button"
                        disabled={fabricOff}
                        onClick={() => onExportCanvasJson?.()}
                        className="flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
                    >
                        <FileJson className="h-3.5 w-3.5 shrink-0" />
                        Export canvas JSON
                    </button>
                    <button
                        type="button"
                        disabled={fabricOff}
                        onClick={() => onExportPngPreview?.()}
                        className="flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
                    >
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                        Export PNG preview
                    </button>
                    <button
                        type="button"
                        disabled={fabricOff || printPipelineBusy || !hasHiFiPrompt}
                        onClick={() => onRunHighFidelity?.()}
                        className="flex h-9 w-full items-center justify-start gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 text-xs font-semibold text-white shadow hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        {printPipelineBusy ? 'Working…' : 'AI: high fidelity'}
                    </button>
                    <button
                        type="button"
                        disabled={fabricOff || printPipelineBusy}
                        onClick={() => onValidatePrintRules?.()}
                        className="flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-xs font-medium text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/60"
                    >
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        Validate print rules
                    </button>
                    <button
                        type="button"
                        disabled={fabricOff}
                        onClick={() => onExportFinalPng?.()}
                        className="flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
                    >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        Export final PNG
                    </button>
                </div>

                {printPipelineHighFiUrl ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                        <p className="border-b border-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500 dark:border-gray-800">High-fidelity result</p>
                        <img src={printPipelineHighFiUrl} alt="" className="max-h-36 w-full object-contain" />
                    </div>
                ) : null}
                {printPipelineValidationOk === true ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Validation: OK</p>
                ) : null}
                {printPipelineValidationOk === false ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">Validation: see toast / network</p>
                ) : null}
            </div>
        </aside>
    );
}
