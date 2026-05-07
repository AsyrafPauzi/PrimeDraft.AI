import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFactoryPricing, getMatchingFactories, putFactoryPricing } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function FactoryMatchingPage({ token, onNotify }) {
    const [countryCode, setCountryCode] = useState('');
    const [factories, setFactories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [pricingLoading, setPricingLoading] = useState(false);
    const [pricingError, setPricingError] = useState('');
    const [canonicalCodes, setCanonicalCodes] = useState([]);
    const [priceByCode, setPriceByCode] = useState({});
    const [factoryMeta, setFactoryMeta] = useState(null);
    const [savingPricing, setSavingPricing] = useState(false);

    const loadMatching = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const payload = await getMatchingFactories(token);
            setCountryCode(payload.country_code || '');
            setFactories(payload.factories || []);
            onNotify?.('Factory matching refreshed.', 'success');
        } catch (requestError) {
            setError(requestError.message);
            onNotify?.(requestError.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [token, onNotify]);

    const loadPricing = useCallback(async () => {
        setPricingLoading(true);
        setPricingError('');
        try {
            const payload = await getFactoryPricing(token);
            if (payload.factory) {
                setFactoryMeta(payload.factory);
            } else {
                setFactoryMeta(null);
            }
            const codes = payload.canonical_size_codes || [];
            setCanonicalCodes(codes);
            const next = {};
            (payload.sizes || []).forEach((row) => {
                if (row.code) {
                    next[row.code] = String(row.price ?? '');
                }
            });
            codes.forEach((c) => {
                if (next[c] === undefined) next[c] = '';
            });
            setPriceByCode(next);
        } catch (requestError) {
            setPricingError(requestError.message);
        } finally {
            setPricingLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadMatching();
    }, [loadMatching]);

    useEffect(() => {
        void loadPricing();
    }, [loadPricing]);

    const pricingRows = useMemo(
        () =>
            canonicalCodes.map((code) => ({
                code,
                value: priceByCode[code] ?? '',
            })),
        [canonicalCodes, priceByCode]
    );

    async function handleSavePricing() {
        setSavingPricing(true);
        setPricingError('');
        try {
            const sizes = canonicalCodes.map((size_code) => ({
                size_code,
                price: priceByCode[size_code] === '' || priceByCode[size_code] === undefined ? 0 : parseFloat(String(priceByCode[size_code])) || 0,
            }));
            await putFactoryPricing(token, { sizes });
            onNotify?.('Size prices saved.', 'success');
            await loadPricing();
        } catch (requestError) {
            setPricingError(requestError.message);
            onNotify?.(requestError.message, 'error');
        } finally {
            setSavingPricing(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Factory matching</CardTitle>
                    <CardDescription>Factories available for your country (with priced sizes only in the API).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button variant="outline" onClick={() => void loadMatching()} disabled={loading}>
                        Refresh matching
                    </Button>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Country: {countryCode || '-'}</p>
                    {factories.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">No factories returned for this workspace.</p>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {factories.map((factory) => (
                                <li key={factory.id} className="rounded border border-gray-200 p-3 dark:border-gray-700">
                                    <span className="font-medium">{factory.name}</span>
                                    <span className="text-gray-500"> — base RM {factory.base_price}</span>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Priced sizes: {(factory.sizes || []).map((s) => `${s.code} (${s.price})`).join(', ') || 'none'}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {error ? (
                        <p className="text-sm text-red-600" role="alert">
                            {error}
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Per-size pricing</CardTitle>
                    <CardDescription>
                        Set prices (MYR) for each size. Only sizes with a positive price appear to buyers in matching and draft orders. Linked factory:{' '}
                        {factoryMeta?.name || '—'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pricingLoading ? <p className="text-sm text-gray-500">Loading pricing…</p> : null}
                    {pricingError ? (
                        <p className="text-sm text-red-600" role="alert">
                            {pricingError}
                        </p>
                    ) : null}
                    {!pricingLoading && canonicalCodes.length > 0 ? (
                        <>
                            <div className="grid max-w-md gap-3 sm:grid-cols-2">
                                {pricingRows.map(({ code, value }) => (
                                    <div key={code} className="space-y-1">
                                        <Label htmlFor={`price-${code}`} className="text-xs uppercase text-gray-500">
                                            {code}
                                        </Label>
                                        <Input
                                            id={`price-${code}`}
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            inputMode="decimal"
                                            placeholder="0 = omit"
                                            value={value}
                                            onChange={(e) =>
                                                setPriceByCode((prev) => ({
                                                    ...prev,
                                                    [code]: e.target.value,
                                                }))
                                            }
                                            className="h-9"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button type="button" onClick={() => void handleSavePricing()} disabled={savingPricing}>
                                {savingPricing ? 'Saving…' : 'Save prices'}
                            </Button>
                        </>
                    ) : null}
                    {!pricingLoading && canonicalCodes.length === 0 && !pricingError ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">No factory linked to this account for pricing.</p>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
