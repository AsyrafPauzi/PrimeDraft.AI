import React, { useCallback, useMemo, useState } from 'react';
import { Check, ChevronRight, Circle, Download, ImageIcon, Sparkles } from 'lucide-react';
import {
    generateCanvasImage,
    pipelineRemoveBackground,
    pipelineTo300Dpi,
    pipelineUpscale,
    pipelineVectorize,
} from '../../lib/api';

const STEPS = [
    { id: 'generate', label: 'AI generate' },
    { id: 'confirm', label: 'Image confirmed' },
    { id: 'upscale', label: 'AI upscale' },
    { id: 'remove_bg', label: 'Background removal' },
    { id: 'dpi', label: 'Convert to 300 DPI' },
    { id: 'vector', label: 'Optional vectorization' },
    { id: 'export', label: 'Export PNG / PDF / SVG' },
];

function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Linear production flow: generate → confirm → upscale → remove BG → 300 DPI → optional SVG → export.
 */
export function AiProductionPipeline({
    token,
    projectId,
    prompt,
    canvasFidelity = 'balanced',
    disabled = false,
    onNotify,
    onApplyToCanvas,
}) {
    const [busy, setBusy] = useState(false);
    const [workingImage, setWorkingImage] = useState(null);
    const [confirmed, setConfirmed] = useState(false);
    const [done, setDone] = useState(() => Object.fromEntries(STEPS.map((s) => [s.id, false])));
    const [svgText, setSvgText] = useState(null);
    const [targetWidthIn, setTargetWidthIn] = useState(10);

    const stepIndex = useMemo(() => {
        if (!workingImage) return 0;
        if (!confirmed) return 1;
        if (!done.upscale) return 2;
        if (!done.remove_bg) return 3;
        if (!done.dpi) return 4;
        if (!done.vector) return 5;
        return 6;
    }, [workingImage, confirmed, done]);

    const setStepDone = useCallback((id, value = true) => {
        setDone((prev) => ({ ...prev, [id]: value }));
    }, []);

    const runGenerate = useCallback(async () => {
        if (!token || !projectId || !prompt?.trim()) {
            onNotify?.('Enter a prompt and ensure a project is open.', 'error');
            return;
        }
        setBusy(true);
        try {
            const res = await generateCanvasImage(token, projectId, {
                prompt: prompt.trim(),
                fidelity: canvasFidelity,
            });
            if (res?.data_url) {
                setWorkingImage(res.data_url);
                setConfirmed(false);
                setSvgText(null);
                setDone(() => {
                    const o = Object.fromEntries(STEPS.map((s) => [s.id, false]));
                    o.generate = true;
                    return o;
                });
                onNotify?.('Image generated. Review and confirm to continue.', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || 'Generate failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [token, projectId, prompt, canvasFidelity, onNotify]);

    const runUpscale = useCallback(async () => {
        if (!workingImage) return;
        setBusy(true);
        try {
            const res = await pipelineUpscale(token, projectId, workingImage);
            if (res?.data_url) {
                setWorkingImage(res.data_url);
                setStepDone('upscale', true);
                onNotify?.('Upscale complete.', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || 'Upscale failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [token, projectId, workingImage, onNotify, setStepDone]);

    const runRemoveBg = useCallback(async () => {
        if (!workingImage) return;
        setBusy(true);
        try {
            const res = await pipelineRemoveBackground(token, projectId, workingImage);
            if (res?.data_url) {
                setWorkingImage(res.data_url);
                setStepDone('remove_bg', true);
                onNotify?.('Background removal applied (bright pixels → transparent).', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || 'Background removal failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [token, projectId, workingImage, onNotify, setStepDone]);

    const runDpi = useCallback(async () => {
        if (!workingImage) return;
        setBusy(true);
        try {
            const res = await pipelineTo300Dpi(token, projectId, {
                image_base64: workingImage,
                target_width_inches: targetWidthIn,
                dpi: 300,
            });
            if (res?.data_url) {
                setWorkingImage(res.data_url);
                setStepDone('dpi', true);
                onNotify?.('Resized for 300 DPI print width.', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || '300 DPI step failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [token, projectId, workingImage, targetWidthIn, onNotify, setStepDone]);

    const runVectorize = useCallback(async () => {
        if (!workingImage) return;
        setBusy(true);
        try {
            const res = await pipelineVectorize(token, projectId, workingImage);
            if (res?.svg) {
                setSvgText(res.svg);
                setStepDone('vector', true);
                onNotify?.('SVG created (embedded raster).', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || 'Vectorization failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [token, projectId, workingImage, onNotify, setStepDone]);

    const skipVector = useCallback(() => {
        setStepDone('vector', true);
        setSvgText(null);
        onNotify?.('Skipped optional vectorization.', 'success');
    }, [onNotify, setStepDone]);

    const downloadPdf = useCallback(async () => {
        if (!workingImage) return;
        setBusy(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const res = await fetch(workingImage);
            const bytes = await res.arrayBuffer();
            const pdf = await PDFDocument.create();
            const isPng = workingImage.startsWith('data:image/png');
            const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
            const page = pdf.addPage([img.width, img.height]);
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
            const out = await pdf.save();
            const blob = new Blob([out], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'primedraft-export.pdf';
            a.click();
            URL.revokeObjectURL(url);
            onNotify?.('PDF downloaded.', 'success');
        } catch (e) {
            onNotify?.(e?.message || 'PDF export failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [workingImage, onNotify]);

    const downloadSvg = useCallback(async () => {
        if (svgText) {
            downloadText(svgText, 'primedraft-export.svg', 'image/svg+xml');
            return;
        }
        if (!workingImage) return;
        setBusy(true);
        try {
            const res = await pipelineVectorize(token, projectId, workingImage);
            if (res?.svg) {
                setSvgText(res.svg);
                downloadText(res.svg, 'primedraft-export.svg', 'image/svg+xml');
                setStepDone('vector', true);
                onNotify?.('SVG downloaded.', 'success');
            }
        } catch (e) {
            onNotify?.(e?.message || 'SVG export failed.', 'error');
        } finally {
            setBusy(false);
        }
    }, [svgText, workingImage, token, projectId, onNotify, setStepDone]);

    const off = disabled || busy || !projectId;

    return (
        <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-500/30 dark:bg-violet-950/25">
            <div className="mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-violet-700 dark:text-violet-300" />
                <h3 className="text-xs font-semibold text-violet-900 dark:text-violet-100">Production pipeline</h3>
            </div>
            <p className="mb-3 text-[10px] leading-snug text-violet-900/85 dark:text-violet-200/90">
                AI generate → confirm → upscale → remove background → 300 DPI → optional SVG → export. Server uses GD for raster steps; OpenAI only for the first generate.
            </p>

            <ol className="mb-3 space-y-1.5">
                {STEPS.map((s, i) => {
                    const active = i === stepIndex;
                    const complete =
                        (s.id === 'generate' && workingImage) ||
                        (s.id === 'confirm' && confirmed) ||
                        (s.id !== 'generate' && s.id !== 'confirm' && done[s.id]);
                    return (
                        <li
                            key={s.id}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] ${
                                active ? 'bg-white/90 font-medium text-violet-900 dark:bg-gray-900/80 dark:text-violet-100' : 'text-violet-800/80 dark:text-violet-300/80'
                            }`}
                        >
                            {complete ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
                            <span>
                                {i + 1}. {s.label}
                            </span>
                            {active ? <ChevronRight className="ml-auto h-3 w-3 text-violet-500" /> : null}
                        </li>
                    );
                })}
            </ol>

            {workingImage ? (
                <div className="mb-3 overflow-hidden rounded-lg border border-violet-200/80 bg-white dark:border-violet-500/20 dark:bg-gray-900">
                    <img src={workingImage} alt="Pipeline preview" className="max-h-40 w-full object-contain" />
                </div>
            ) : null}

            <div className="flex flex-col gap-2">
                {!workingImage ? (
                    <button
                        type="button"
                        disabled={off || !prompt?.trim()}
                        onClick={() => void runGenerate()}
                        className="flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50 dark:bg-violet-600 dark:hover:bg-violet-500"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        1 · Run AI generate
                    </button>
                ) : null}

                {workingImage && !confirmed ? (
                    <button
                        type="button"
                        disabled={off}
                        onClick={() => {
                            setConfirmed(true);
                            onNotify?.('Image confirmed for processing.', 'success');
                        }}
                        className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/40 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-gray-800"
                    >
                        2 · Confirm image
                    </button>
                ) : null}

                {confirmed && !done.upscale ? (
                    <button
                        type="button"
                        disabled={off}
                        onClick={() => void runUpscale()}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                        3 · Run AI upscale (2× resample)
                    </button>
                ) : null}

                {done.upscale && !done.remove_bg ? (
                    <button
                        type="button"
                        disabled={off}
                        onClick={() => void runRemoveBg()}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                        4 · Remove light background
                    </button>
                ) : null}

                {done.remove_bg && !done.dpi ? (
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-violet-900 dark:text-violet-200">Print width (inches) at 300 DPI</label>
                        <input
                            type="number"
                            min={0.5}
                            max={54}
                            step={0.5}
                            value={targetWidthIn}
                            onChange={(e) => setTargetWidthIn(Number(e.target.value) || 10)}
                            className="w-full rounded border border-violet-200 px-2 py-1 text-xs dark:border-violet-500/40 dark:bg-gray-900"
                        />
                        <button
                            type="button"
                            disabled={off}
                            onClick={() => void runDpi()}
                            className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                        >
                            5 · Convert to 300 DPI
                        </button>
                    </div>
                ) : null}

                {done.dpi && !done.vector ? (
                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            disabled={off}
                            onClick={() => void runVectorize()}
                            className="rounded-lg border border-violet-400 bg-white px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-gray-800"
                        >
                            6 · Optional · Create SVG (embedded PNG)
                        </button>
                        <button
                            type="button"
                            disabled={off}
                            onClick={() => skipVector()}
                            className="text-[10px] font-medium text-violet-700 underline dark:text-violet-300"
                        >
                            Skip vectorization
                        </button>
                    </div>
                ) : null}

                {done.vector && done.dpi ? (
                    <div className="space-y-2 rounded-lg border border-violet-200 bg-white/90 p-2 dark:border-violet-500/30 dark:bg-gray-900/90">
                        <p className="text-[10px] font-semibold text-violet-900 dark:text-violet-100">7 · Export</p>
                        <div className="flex flex-col gap-1.5">
                            <button
                                type="button"
                                disabled={off || !workingImage}
                                onClick={() => downloadDataUrl(workingImage, 'primedraft-export.png')}
                                className="flex items-center justify-center gap-1.5 rounded-md bg-violet-700 py-1.5 text-[11px] font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                            >
                                <Download className="h-3 w-3" />
                                PNG
                            </button>
                            <button
                                type="button"
                                disabled={off || !workingImage}
                                onClick={() => void downloadPdf()}
                                className="flex items-center justify-center gap-1.5 rounded-md border border-violet-300 py-1.5 text-[11px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/40 dark:text-violet-100 dark:hover:bg-gray-800"
                            >
                                <Download className="h-3 w-3" />
                                PDF
                            </button>
                            <button
                                type="button"
                                disabled={off || !workingImage}
                                onClick={() => void downloadSvg()}
                                className="flex items-center justify-center gap-1.5 rounded-md border border-violet-300 py-1.5 text-[11px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-500/40 dark:text-violet-100 dark:hover:bg-gray-800"
                            >
                                <Download className="h-3 w-3" />
                                SVG
                            </button>
                            <button
                                type="button"
                                disabled={off || !workingImage}
                                onClick={() => {
                                    onApplyToCanvas?.(workingImage);
                                    onNotify?.('Placed on canvas.', 'success');
                                }}
                                className="mt-1 rounded-md bg-emerald-600 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                                Place result on canvas
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {workingImage ? (
                <button
                    type="button"
                    disabled={off}
                    onClick={() => {
                        setWorkingImage(null);
                        setConfirmed(false);
                        setSvgText(null);
                        setDone(Object.fromEntries(STEPS.map((s) => [s.id, false])));
                    }}
                    className="mt-2 w-full text-[10px] text-violet-700 underline dark:text-violet-300"
                >
                    Reset pipeline
                </button>
            ) : null}
        </div>
    );
}
