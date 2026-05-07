import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { createDraftOrder, getMatchingFactories, saveScratchLayout } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { getScratchMerchandise } from '../../lib/merchandisePreview';
import { getSidesForMerchandise, mergeScratchForSave } from '../../lib/editorLayout';

const STEPS = ['Review', 'Factory', 'Sizes', 'Submit'];

export function SaveProductWizard({
    open,
    onOpenChange,
    token,
    projectId,
    project,
    layout,
    onLayoutSaved,
    onNotify,
    onDraftCreated,
}) {
    const [step, setStep] = useState(0);
    const [savingScratch, setSavingScratch] = useState(false);
    const [matchingLoading, setMatchingLoading] = useState(false);
    const [matchingError, setMatchingError] = useState('');
    const [factories, setFactories] = useState([]);
    const [countryCode, setCountryCode] = useState('');
    const [selectedFactoryId, setSelectedFactoryId] = useState(null);
    const [qtyByCode, setQtyByCode] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const selectedFactory = useMemo(
        () => factories.find((f) => f.id === selectedFactoryId) || null,
        [factories, selectedFactoryId]
    );

    useEffect(() => {
        if (!open) {
            setStep(0);
            setMatchingError('');
            setSubmitError('');
            setQtyByCode({});
            setSelectedFactoryId(null);
            setFactories([]);
        }
    }, [open]);

    async function ensureScratchSaved() {
        if (!token || !projectId) throw new Error('No project selected.');
        setSavingScratch(true);
        try {
            const payload = mergeScratchForSave(project?.scratch_layout, layout);
            await saveScratchLayout(token, projectId, payload);
            onLayoutSaved?.(payload);
        } finally {
            setSavingScratch(false);
        }
    }

    async function loadMatching() {
        if (!token) return;
        setMatchingLoading(true);
        setMatchingError('');
        try {
            const payload = await getMatchingFactories(token, { project_id: projectId });
            setCountryCode(payload.country_code || '');
            setFactories(payload.factories || []);
        } catch (e) {
            setMatchingError(e?.message || 'Could not load factories.');
        } finally {
            setMatchingLoading(false);
        }
    }

    async function goNext() {
        setSubmitError('');
        if (step === 0) {
            try {
                await ensureScratchSaved();
                await loadMatching();
                setStep(1);
            } catch (e) {
                setSubmitError(e?.message || 'Save failed.');
            }
            return;
        }
        if (step === 1) {
            if (!selectedFactoryId) {
                setSubmitError('Select a factory.');
                return;
            }
            const f = factories.find((x) => x.id === selectedFactoryId);
            const nextQty = {};
            (f?.sizes || []).forEach((s) => {
                nextQty[s.code] = qtyByCode[s.code] ?? 0;
            });
            setQtyByCode(nextQty);
            setStep(2);
            return;
        }
        if (step === 2) {
            setStep(3);
        }
    }

    function goBack() {
        setSubmitError('');
        setStep((s) => Math.max(0, s - 1));
    }

    const linesForSubmit = useMemo(() => {
        if (!selectedFactory?.sizes) return [];
        return selectedFactory.sizes
            .map((s) => ({
                size_code: s.code,
                qty: Math.max(0, parseInt(String(qtyByCode[s.code] || 0), 10) || 0),
                unit_price: s.price,
            }))
            .filter((row) => row.qty >= 1);
    }, [selectedFactory, qtyByCode]);

    const lineSum = useMemo(
        () => linesForSubmit.reduce((acc, row) => acc + row.qty * row.unit_price, 0),
        [linesForSubmit]
    );

    async function submitDraft() {
        if (!token || !projectId || !selectedFactoryId) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            const payload = await createDraftOrder(token, projectId, {
                factory_id: selectedFactoryId,
                lines: linesForSubmit.map(({ size_code, qty }) => ({ size_code, qty })),
            });
            onDraftCreated?.(payload.order);
            onNotify?.('Draft order saved.', 'success');
            onOpenChange(false);
        } catch (e) {
            setSubmitError(e?.message || 'Could not create order.');
            onNotify?.(e?.message, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    const reviewSides = useMemo(() => {
        const label = layout?.merchandise || getScratchMerchandise(project?.scratch_layout) || '';
        return getSidesForMerchandise(label);
    }, [layout?.merchandise, project?.scratch_layout]);

    const layerSummary = useMemo(() => {
        const counts = {};
        reviewSides.forEach((side) => {
            counts[side] = layout?.sides?.[side]?.layers?.length ?? 0;
        });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { counts, total };
    }, [layout, reviewSides]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(100vw-24px,520px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-50">Save product</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Review your design, pick a factory, enter quantities by size, and create a draft order.
                    </Dialog.Description>

                    <div className="mt-4 flex flex-wrap gap-1 text-xs font-medium">
                        {STEPS.map((label, idx) => (
                            <span
                                key={label}
                                className={`rounded-full px-2 py-1 ${
                                    idx === step
                                        ? 'bg-indigo-600 text-white'
                                        : idx < step
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                }`}
                            >
                                {idx + 1}. {label}
                            </span>
                        ))}
                    </div>

                    <div className="mt-5 min-h-[200px]">
                        {step === 0 ? (
                            <div className="space-y-3 text-sm">
                                <p>
                                    Project:{' '}
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{project?.name || `#${projectId}`}</span>
                                </p>
                                <p>Country / matching: {project?.country_code || '—'}</p>
                                <p>
                                    Layers: <span className="font-semibold">{layerSummary.total}</span> total
                                </p>
                                <ul className="list-inside list-disc text-gray-600 dark:text-gray-300">
                                    {reviewSides.map((side) => (
                                        <li key={side}>
                                            {side}: {layerSummary.counts[side] ?? 0} layer(s)
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-gray-500">We’ll save the latest layout to your project before matching factories.</p>
                            </div>
                        ) : null}

                        {step === 1 ? (
                            <div className="space-y-3">
                                {matchingLoading ? <p className="text-sm text-gray-500">Loading factories…</p> : null}
                                {matchingError ? (
                                    <p className="text-sm text-red-600" role="alert">
                                        {matchingError}
                                    </p>
                                ) : null}
                                <p className="text-xs text-gray-500">Region: {countryCode}</p>
                                <div className="max-h-60 space-y-2 overflow-y-auto">
                                    {factories.map((factory) => (
                                        <label
                                            key={factory.id}
                                            className={`flex cursor-pointer flex-col rounded-lg border p-3 text-sm ${
                                                selectedFactoryId === factory.id
                                                    ? 'border-indigo-500 bg-indigo-50 dark:border-cyan-500 dark:bg-cyan-500/10'
                                                    : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <input
                                                    type="radio"
                                                    name="factory-choice"
                                                    className="mt-1"
                                                    checked={selectedFactoryId === factory.id}
                                                    onChange={() => setSelectedFactoryId(factory.id)}
                                                />
                                                <div>
                                                    <div className="font-medium">{factory.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {(factory.sizes || []).length} priced size(s)
                                                        {factory.sizes?.length ? ` · from ${factory.sizes[0].code}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {!matchingLoading && factories.length === 0 ? (
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        No factories with priced sizes for this region. Ask a factory user to add size prices, or try another project
                                        country.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {step === 2 && selectedFactory ? (
                            <div className="space-y-3">
                                <p className="text-sm font-medium">{selectedFactory.name}</p>
                                <p className="text-xs text-gray-500">Enter quantity (0 skips that size). Only priced sizes are listed.</p>
                                <div className="space-y-2">
                                    {(selectedFactory.sizes || []).map((s) => (
                                        <div key={s.code} className="flex items-center gap-2">
                                            <Label className="w-12 shrink-0 text-xs">{s.code}</Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                className="h-9 w-24"
                                                value={qtyByCode[s.code] ?? ''}
                                                onChange={(e) =>
                                                    setQtyByCode((prev) => ({
                                                        ...prev,
                                                        [s.code]: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0),
                                                    }))
                                                }
                                            />
                                            <span className="text-xs text-gray-500">× MYR {Number(s.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {step === 3 ? (
                            <div className="space-y-2 text-sm">
                                <p>Factory: {selectedFactory?.name}</p>
                                {linesForSubmit.length === 0 ? (
                                    <p className="text-amber-600">Add at least one size with quantity ≥ 1.</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {linesForSubmit.map((row) => (
                                            <li key={row.size_code} className="flex justify-between">
                                                <span>
                                                    {row.size_code} × {row.qty}
                                                </span>
                                                <span className="tabular-nums">
                                                    {(row.qty * row.unit_price).toFixed(2)} MYR
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <p className="border-t border-gray-100 pt-2 font-semibold dark:border-gray-800">
                                    Total production (snapshot){' '}
                                    <span className="tabular-nums text-indigo-600 dark:text-cyan-400">{lineSum.toFixed(2)} MYR</span>
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {submitError ? (
                        <p className="mt-3 text-sm text-red-600" role="alert">
                            {submitError}
                        </p>
                    ) : null}

                    <div className="mt-6 flex flex-wrap justify-between gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <div className="flex gap-2">
                            {step > 0 ? (
                                <Button type="button" variant="outline" onClick={goBack}>
                                    Back
                                </Button>
                            ) : null}
                            {step < 3 ? (
                                <Button type="button" onClick={() => void goNext()} disabled={savingScratch || matchingLoading}>
                                    {step === 0 && savingScratch ? 'Saving…' : 'Continue'}
                                </Button>
                            ) : (
                                <Button type="button" onClick={() => void submitDraft()} disabled={submitting || linesForSubmit.length === 0}>
                                    {submitting ? 'Submitting…' : 'Create draft order'}
                                </Button>
                            )}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
