import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';
import { checkoutFreelancerSubscription, verifyFreelancerUpgrade } from '../lib/api';
import { COUNTRIES } from '../data/countries';
import { ArrowLeft, Building2, Check, ChevronRight, Copy, CreditCard, Globe, Lock, Mail, MapPin, RefreshCw, Shield, Sparkles, User } from 'lucide-react';

const FALLBACK_MONTHLY = 300;
const FALLBACK_YEARLY = 3240;

export function SettingsPage({ auth, onProfileUpdate, focusUpgrade = false }) {
    const [name, setName] = useState(auth?.user?.name || '');
    const [countryCode, setCountryCode] = useState((auth?.user?.country_code || 'MY').toUpperCase());
    const [emailAddress, setEmailAddress] = useState(auth?.user?.email || '');
    const [companyName, setCompanyName] = useState(auth?.user?.company_name || '');
    const [companyRegistrationNo, setCompanyRegistrationNo] = useState(auth?.user?.company_registration_no || '');
    const [billingLine1, setBillingLine1] = useState(auth?.user?.billing_line1 || '');
    const [billingLine2, setBillingLine2] = useState(auth?.user?.billing_line2 || '');
    const [billingCity, setBillingCity] = useState(auth?.user?.billing_city || '');
    const [billingState, setBillingState] = useState(auth?.user?.billing_state || '');
    const [billingPostcode, setBillingPostcode] = useState(auth?.user?.billing_postcode || '');
    const [receiverLine1, setReceiverLine1] = useState(auth?.user?.receiver_line1 || '');
    const [receiverLine2, setReceiverLine2] = useState(auth?.user?.receiver_line2 || '');
    const [receiverCity, setReceiverCity] = useState(auth?.user?.receiver_city || '');
    const [receiverState, setReceiverState] = useState(auth?.user?.receiver_state || '');
    const [receiverPostcode, setReceiverPostcode] = useState(auth?.user?.receiver_postcode || '');
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [upgradeInfo, setUpgradeInfo] = useState(null);
    const [upgradeChannel, setUpgradeChannel] = useState('billplz');
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [upgradeError, setUpgradeError] = useState('');
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);
    const upgradeAnchorRef = useRef(null);

    const roleLabel = useMemo(() => auth?.user?.role || 'normal', [auth]);

    const monthlyAmount = Number(upgradeInfo?.monthly_amount ?? upgradeInfo?.required_amount ?? FALLBACK_MONTHLY);
    const yearlyAmount = Number(upgradeInfo?.yearly_amount ?? FALLBACK_YEARLY);
    const yearlyDiscountPercent = Number(upgradeInfo?.yearly_discount_percent ?? 10);
    const currency = upgradeInfo?.currency || 'MYR';

    const orderTotal = billingCycle === 'yearly' ? yearlyAmount : monthlyAmount;
    const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
    const grossAnnual = monthlyAmount * 12;
    const yearlySavings = Math.max(0, grossAnnual - yearlyAmount);

    useEffect(() => {
        const u = auth?.user;
        if (!u) return undefined;
        setName(u.name || '');
        const nextCode = (u.country_code || 'MY').toUpperCase();
        setCountryCode(COUNTRIES.some((c) => c.code === nextCode) ? nextCode : 'MY');
        setEmailAddress(u.email || '');
        setCompanyName(u.company_name || '');
        setCompanyRegistrationNo(u.company_registration_no || '');
        setBillingLine1(u.billing_line1 || '');
        setBillingLine2(u.billing_line2 || '');
        setBillingCity(u.billing_city || '');
        setBillingState(u.billing_state || '');
        setBillingPostcode(u.billing_postcode || '');
        setReceiverLine1(u.receiver_line1 || '');
        setReceiverLine2(u.receiver_line2 || '');
        setReceiverCity(u.receiver_city || '');
        setReceiverState(u.receiver_state || '');
        setReceiverPostcode(u.receiver_postcode || '');
        return undefined;
    }, [auth?.user]);

    function copyBillingToReceiver() {
        setReceiverLine1(billingLine1);
        setReceiverLine2(billingLine2);
        setReceiverCity(billingCity);
        setReceiverState(billingState);
        setReceiverPostcode(billingPostcode);
    }

    async function handleSave(event) {
        event.preventDefault();
        setSaveError('');
        setSaved(false);
        if (!onProfileUpdate) return;
        try {
            await onProfileUpdate({
                name,
                country_code: countryCode,
                email: emailAddress,
                company_name: companyName || '',
                company_registration_no: companyRegistrationNo || '',
                billing_line1: billingLine1 || '',
                billing_line2: billingLine2 || '',
                billing_city: billingCity || '',
                billing_state: billingState || '',
                billing_postcode: billingPostcode || '',
                receiver_line1: receiverLine1 || '',
                receiver_line2: receiverLine2 || '',
                receiver_city: receiverCity || '',
                receiver_state: receiverState || '',
                receiver_postcode: receiverPostcode || '',
            });
            setSaved(true);
        } catch (err) {
            setSaveError(err?.message || 'Could not save settings.');
        }
    }

    async function loadUpgradeStatus() {
        if (!auth?.token) return;
        setUpgradeError('');
        setUpgradeMessage('');
        setPlanLoading(true);
        try {
            const payload = await verifyFreelancerUpgrade(auth.token);
            setUpgradeInfo(payload);
            if (payload.message) {
                setUpgradeMessage(payload.message);
            }
        } catch (requestError) {
            setUpgradeError(requestError.message);
        } finally {
            setPlanLoading(false);
        }
    }

    useEffect(() => {
        if (roleLabel !== 'normal') return undefined;
        loadUpgradeStatus();
        return undefined;
    }, [roleLabel, auth?.token]);

    useEffect(() => {
        if (!focusUpgrade || roleLabel !== 'normal') return undefined;
        const id = requestAnimationFrame(() => {
            const el = upgradeAnchorRef.current;
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        return () => cancelAnimationFrame(id);
    }, [focusUpgrade, roleLabel]);

    async function handleRefreshPlan() {
        setUpgradeLoading(true);
        try {
            await loadUpgradeStatus();
        } finally {
            setUpgradeLoading(false);
        }
    }

    async function handleSubscriptionCheckout() {
        setUpgradeError('');
        setUpgradeMessage('');
        setUpgradeLoading(true);
        try {
            const payload = await checkoutFreelancerSubscription(auth?.token, {
                channel: upgradeChannel,
                billing_cycle: billingCycle,
            });
            const paymentId = payload?.payment?.id;
            setUpgradeMessage(
                [payload?.message ?? 'Checkout started.', paymentId != null ? `Payment ID: ${paymentId}.` : null]
                    .filter(Boolean)
                    .join(' ')
            );
        } catch (requestError) {
            setUpgradeError(requestError.message);
        } finally {
            setUpgradeLoading(false);
        }
    }

    const benefits =
        upgradeInfo?.benefits?.length > 0
            ? upgradeInfo.benefits
            : [
                  'Access freelancer dashboard and client workspace',
                  'Priority design revision workflow',
                  'Freelancer project and client management',
              ];

    const showCheckout = roleLabel === 'normal' && upgradeInfo?.eligible && !upgradeInfo?.already_subscribed;
    const isNormal = roleLabel === 'normal';
    const upgradePage = focusUpgrade && isNormal;

    return (
        <div className="mx-auto w-full max-w-6xl min-w-0 space-y-8 pb-10">
            <header className="space-y-2">
                <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Link to="/dashboard" className="transition-colors hover:text-indigo-600 dark:hover:text-cyan-400">
                        Workspace
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                    {upgradePage ? (
                        <>
                            <Link to="/settings" className="transition-colors hover:text-indigo-600 dark:hover:text-cyan-400">
                                Settings
                            </Link>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            <span className="text-slate-800 dark:text-slate-100">Freelancer upgrade</span>
                        </>
                    ) : (
                        <span className="text-slate-800 dark:text-slate-100">Settings</span>
                    )}
                </nav>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        {upgradePage ? 'Upgrade to Freelancer' : 'Settings'}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {upgradePage
                            ? 'Review plan benefits, choose billing cadence, and complete checkout in one place.'
                            : 'Manage your profile, delivery preferences, and workspace subscription.'}
                    </p>
                </div>
                {isNormal && !upgradePage ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button variant="outline" size="sm" asChild className="gap-1.5 border-indigo-200/80 dark:border-cyan-500/25">
                            <Link to="/settings/upgrade">
                                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                                Upgrade plan
                            </Link>
                        </Button>
                    </div>
                ) : null}
            </header>

            <div
                className={cn(
                    'grid min-w-0 gap-8',
                    isNormal && !upgradePage && 'lg:grid-cols-12 lg:items-start',
                    isNormal && upgradePage && 'mx-auto w-full max-w-4xl grid-cols-1'
                )}
            >
                <div
                    className={cn(
                        'min-w-0 space-y-6',
                        isNormal && !upgradePage && 'lg:col-span-7',
                        isNormal && upgradePage && 'order-2',
                        !isNormal && 'max-w-2xl'
                    )}
                >
                    {upgradePage ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200/60 bg-slate-50/80 px-4 py-3 dark:border-cyan-500/20 dark:bg-slate-900/40">
                            <p className="text-sm text-slate-600 dark:text-slate-300">Need to edit profile or delivery defaults?</p>
                            <Button variant="outline" size="sm" asChild>
                                <Link to="/settings" className="gap-1.5">
                                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                                    Profile settings
                                </Link>
                            </Button>
                        </div>
                    ) : null}
                    <Card id="workspace-profile" className="border-indigo-200/60 shadow-sm dark:border-cyan-500/20">
                        <CardHeader className="space-y-1 border-b border-indigo-100/80 bg-gradient-to-r from-slate-50/80 to-indigo-50/40 pb-4 dark:border-cyan-500/10 dark:from-slate-900/40 dark:to-indigo-950/30">
                            <CardTitle className="text-lg">Profile & workspace</CardTitle>
                            <CardDescription>Information used across projects, billing, and fulfilment.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Account</h3>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="settings-name" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <User className="h-3.5 w-3.5" aria-hidden />
                                                Display name
                                            </Label>
                                            <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="settings-email" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <Mail className="h-3.5 w-3.5" aria-hidden />
                                                Email address
                                            </Label>
                                            <Input
                                                id="settings-email"
                                                type="email"
                                                value={emailAddress}
                                                onChange={(event) => setEmailAddress(event.target.value)}
                                                placeholder="you@company.com"
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="settings-country" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <Globe className="h-3.5 w-3.5" aria-hidden />
                                                Default country / region
                                            </Label>
                                            <select
                                                id="settings-country"
                                                className="flex h-11 w-full rounded-md border border-indigo-200/80 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                                                value={countryCode}
                                                onChange={(event) => setCountryCode(event.target.value)}
                                            >
                                                {COUNTRIES.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Used as your workspace default for projects and tax locale hints.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="settings-role" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <Shield className="h-3.5 w-3.5" aria-hidden />
                                                Plan role
                                            </Label>
                                            <Input id="settings-role" value={roleLabel} readOnly className="h-11 capitalize bg-slate-50 dark:bg-slate-900/60" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-indigo-100 dark:bg-slate-700" />

                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Company (optional)</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Shown on invoices and helps factories match your business profile.</p>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="settings-company" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <Building2 className="h-3.5 w-3.5" aria-hidden />
                                                Company or studio name
                                            </Label>
                                            <Input
                                                id="settings-company"
                                                value={companyName}
                                                onChange={(event) => setCompanyName(event.target.value)}
                                                placeholder="e.g. Studio Satu Sdn Bhd"
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="settings-company-reg" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Company registration no.
                                            </Label>
                                            <Input
                                                id="settings-company-reg"
                                                value={companyRegistrationNo}
                                                onChange={(event) => setCompanyRegistrationNo(event.target.value)}
                                                placeholder="SSM / tax ID (optional)"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-indigo-100 dark:bg-slate-700" />

                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                        <MapPin className="h-4 w-4 text-indigo-600 dark:text-cyan-400" aria-hidden />
                                        Billing address
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Used on invoices and payment receipts.</p>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="billing-line1" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Address line 1
                                            </Label>
                                            <Input id="billing-line1" value={billingLine1} onChange={(e) => setBillingLine1(e.target.value)} className="h-11" placeholder="Street, building, unit" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="billing-line2" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Address line 2 (optional)
                                            </Label>
                                            <Input id="billing-line2" value={billingLine2} onChange={(e) => setBillingLine2(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="billing-city" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                City
                                            </Label>
                                            <Input id="billing-city" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="billing-state" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                State / province
                                            </Label>
                                            <Input id="billing-state" value={billingState} onChange={(e) => setBillingState(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="billing-postcode" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Postcode
                                            </Label>
                                            <Input id="billing-postcode" value={billingPostcode} onChange={(e) => setBillingPostcode(e.target.value)} className="h-11 max-w-xs" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-indigo-100 dark:bg-slate-700" />

                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                                <MapPin className="h-4 w-4 text-indigo-600 dark:text-cyan-400" aria-hidden />
                                                Receiver / shipping address
                                            </h3>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Where physical fulfilment should be sent (can differ from billing).</p>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={copyBillingToReceiver} className="shrink-0 gap-1.5">
                                            <Copy className="h-3.5 w-3.5" aria-hidden />
                                            Copy from billing
                                        </Button>
                                    </div>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="receiver-line1" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Address line 1
                                            </Label>
                                            <Input id="receiver-line1" value={receiverLine1} onChange={(e) => setReceiverLine1(e.target.value)} className="h-11" placeholder="Attention, street, unit" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="receiver-line2" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Address line 2 (optional)
                                            </Label>
                                            <Input id="receiver-line2" value={receiverLine2} onChange={(e) => setReceiverLine2(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="receiver-city" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                City
                                            </Label>
                                            <Input id="receiver-city" value={receiverCity} onChange={(e) => setReceiverCity(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="receiver-state" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                State / province
                                            </Label>
                                            <Input id="receiver-state" value={receiverState} onChange={(e) => setReceiverState(e.target.value)} className="h-11" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="receiver-postcode" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Postcode
                                            </Label>
                                            <Input id="receiver-postcode" value={receiverPostcode} onChange={(e) => setReceiverPostcode(e.target.value)} className="h-11 max-w-xs" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <Button type="submit" className="min-w-[160px] bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500">
                                        Save preferences
                                    </Button>
                                    {saved ? <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved to your account.</span> : null}
                                    {saveError ? <span className="text-sm text-red-600 dark:text-red-400">{saveError}</span> : null}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {isNormal ? (
                    <div
                        ref={upgradeAnchorRef}
                        id="freelancer-upgrade"
                        className={cn('min-w-0', isNormal && !upgradePage && 'lg:col-span-5', isNormal && upgradePage && 'order-1 w-full scroll-mt-24')}
                    >
                        <Card className="overflow-hidden border-indigo-200/70 shadow-md dark:border-cyan-500/25">
                            <div className="relative border-b border-indigo-100/90 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 px-6 py-5 text-white dark:border-cyan-500/20">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_55%)]" aria-hidden />
                                <div className="relative flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                                        <Sparkles className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100">Upgrade</p>
                                        <CardTitle className="mt-0.5 border-0 text-xl text-white">Freelancer subscription</CardTitle>
                                        <CardDescription className="mt-1 text-indigo-100">
                                            Production-ready tools for client delivery, revisions, and growth.
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="space-y-5 p-6">
                                {planLoading && !upgradeInfo ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading plan details…</p>
                                ) : null}

                                {upgradeInfo?.already_subscribed ? (
                                    <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-4 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100">
                                        Your Freelancer subscription is already recorded. If payment is still pending, complete it from your billing
                                        provider email.
                                    </div>
                                ) : null}

                                {upgradeInfo && !upgradeInfo.eligible ? (
                                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                                        {upgradeInfo.message || 'This workspace is not eligible for the Freelancer upgrade path.'}
                                    </div>
                                ) : null}

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        Why upgrade to Freelancer
                                    </p>
                                    <ul className="mt-3 space-y-2.5">
                                        {benefits.map((benefit) => (
                                            <li key={benefit} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300">
                                                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                                                </span>
                                                <span>{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Separator className="bg-indigo-100 dark:bg-slate-700" />

                                {showCheckout ? (
                                    <>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Billing cycle</p>
                                            <div
                                                className="mt-2 flex rounded-lg border border-indigo-200/70 bg-slate-50/80 p-1 dark:border-cyan-500/20 dark:bg-slate-900/50"
                                                role="group"
                                                aria-label="Subscription billing cycle"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setBillingCycle('monthly')}
                                                    className={cn(
                                                        'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
                                                        billingCycle === 'monthly'
                                                            ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-white'
                                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                    )}
                                                >
                                                    Monthly
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBillingCycle('yearly')}
                                                    className={cn(
                                                        'relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
                                                        billingCycle === 'yearly'
                                                            ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-white'
                                                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                                    )}
                                                >
                                                    Yearly
                                                    <Badge className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide bg-emerald-600 text-white hover:bg-emerald-600">
                                                        {yearlyDiscountPercent}% off
                                                    </Badge>
                                                </button>
                                            </div>
                                            {billingCycle === 'yearly' ? (
                                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                                    Yearly billing charges once per year. You save {currency} {yearlySavings.toFixed(2)} compared to twelve
                                                    monthly payments.
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Switch to yearly anytime for a lower effective
                                                    monthly rate.</p>
                                            )}
                                        </div>

                                        <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-b from-white to-slate-50/90 p-5 dark:border-cyan-500/15 dark:from-slate-900 dark:to-slate-950/80">
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                                                Checkout summary
                                            </div>
                                            <dl className="mt-4 space-y-2 text-sm">
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-slate-600 dark:text-slate-400">Plan</dt>
                                                    <dd className="font-medium text-slate-900 dark:text-white">Freelancer (pro workspace)</dd>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                    <dt className="text-slate-600 dark:text-slate-400">Billing cadence</dt>
                                                    <dd className="font-medium text-slate-900 dark:text-white">{cycleLabel}</dd>
                                                </div>
                                                {billingCycle === 'monthly' ? (
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-slate-600 dark:text-slate-400">Freelancer · 1 month</dt>
                                                        <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                                                            {currency} {monthlyAmount.toFixed(2)}
                                                        </dd>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between gap-4">
                                                            <dt className="text-slate-600 dark:text-slate-400">12 months at monthly list price</dt>
                                                            <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                                                                {currency} {grossAnnual.toFixed(2)}
                                                            </dd>
                                                        </div>
                                                        <div className="flex justify-between gap-4 text-emerald-700 dark:text-emerald-400">
                                                            <dt>Yearly plan discount ({yearlyDiscountPercent}%)</dt>
                                                            <dd className="font-medium tabular-nums">{`−${currency} ${yearlySavings.toFixed(2)}`}</dd>
                                                        </div>
                                                    </>
                                                )}
                                                <Separator className="my-3 bg-indigo-100 dark:bg-slate-700" />
                                                <div className="flex justify-between gap-4 text-base">
                                                    <dt className="font-semibold text-slate-900 dark:text-white">Amount due today</dt>
                                                    <dd className="font-semibold tabular-nums text-indigo-700 dark:text-cyan-300">
                                                        {currency} {orderTotal.toFixed(2)}
                                                    </dd>
                                                </div>
                                            </dl>
                                            <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-100/90 bg-indigo-50/40 px-3 py-2.5 text-xs text-slate-600 dark:border-cyan-500/15 dark:bg-slate-800/50 dark:text-slate-300">
                                                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-cyan-400" aria-hidden />
                                                <span>
                                                    Card or bank details are entered only on your payment provider (Billplz or Stripe). PrimeDraft does not
                                                    store full card numbers.
                                                </span>
                                            </div>
                                            <ol className="mt-4 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                                <li>Confirm billing cycle and payment channel below.</li>
                                                <li>Click complete subscription — we create a payment record and redirect or email you a pay link.</li>
                                                <li>After your provider confirms payment, your role updates to Freelancer automatically.</li>
                                            </ol>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="upgrade-channel" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Payment channel
                                            </Label>
                                            <select
                                                id="upgrade-channel"
                                                className="flex h-11 w-full rounded-md border border-indigo-200/80 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                                                value={upgradeChannel}
                                                onChange={(event) => setUpgradeChannel(event.target.value)}
                                            >
                                                <option value="billplz">Billplz</option>
                                                <option value="stripe">Stripe</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                            <Button
                                                type="button"
                                                className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 sm:flex-none sm:min-w-[200px]"
                                                onClick={handleSubscriptionCheckout}
                                                disabled={upgradeLoading}
                                            >
                                                {upgradeLoading ? 'Processing…' : 'Complete subscription'}
                                            </Button>
                                            <Button type="button" variant="outline" onClick={handleRefreshPlan} disabled={upgradeLoading || planLoading}>
                                                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                                                Refresh status
                                            </Button>
                                        </div>
                                    </>
                                ) : null}

                                {!showCheckout && upgradeInfo && upgradeInfo.eligible && !upgradeInfo.already_subscribed ? (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">Confirming eligibility… try refresh if this persists.</p>
                                ) : null}

                                {upgradeMessage ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{upgradeMessage}</p> : null}
                                {upgradeError ? <p className="text-sm text-red-600 dark:text-red-400">{upgradeError}</p> : null}
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
