import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrders, submitProductionOrder } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ArrowRight, PackageSearch, RefreshCw } from 'lucide-react';

const STATUS_VARIANT = {
    draft: 'secondary',
    payment_pending: 'warning',
    pending_production: 'warning',
    pending: 'warning',
    in_production: 'warning',
    shipped: 'success',
    delivered: 'success',
    cancelled: 'destructive',
};

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function totalUnits(order) {
    return (order.lines || []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
}

export function OrdersPage({ token, onSelectProject, onNotify }) {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [submittingId, setSubmittingId] = useState(null);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const payload = await getMyOrders(token);
            setOrders(Array.isArray(payload.orders) ? payload.orders : []);
        } catch (err) {
            setError(err?.message || 'Could not load orders.');
            onNotify?.(err?.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (token) {
            void load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const statusOptions = useMemo(() => {
        const set = new Set(orders.map((o) => o.shipping_status).filter(Boolean));
        return ['all', ...Array.from(set)];
    }, [orders]);

    const filtered = useMemo(() => {
        if (statusFilter === 'all') return orders;
        return orders.filter((o) => o.shipping_status === statusFilter);
    }, [orders, statusFilter]);

    function openProject(projectId) {
        if (!projectId) return;
        onSelectProject?.(projectId);
        navigate('/editor');
    }

    async function handleSubmitProduction(order) {
        const confirmed =
            typeof window === 'undefined'
                ? true
                : window.confirm(`Submit order #${order.id} for production payment? Total: RM ${Number(order.production_price || 0).toFixed(2)}`);

        if (!confirmed) return;

        setSubmittingId(order.id);
        setError('');
        try {
            const payload = await submitProductionOrder(token, order.id, { channel: 'billplz' });
            const paymentId = payload.payment?.id ? ` Payment ID: ${payload.payment.id}.` : '';
            onNotify?.(`Production payment initiated.${paymentId}`, 'success');
            await load();
        } catch (err) {
            setError(err?.message || 'Could not submit production order.');
            onNotify?.(err?.message || 'Could not submit production order.', 'error');
        } finally {
            setSubmittingId(null);
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <PackageSearch className="h-5 w-5" />
                            My orders
                        </CardTitle>
                        <CardDescription>
                            Draft orders you created from the editor. Each row groups quantities by size with a frozen unit
                            price snapshot.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Status:
                        </span>
                        {statusOptions.map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                    statusFilter === status
                                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                                        : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                            </button>
                        ))}
                        <Badge variant="secondary" className="ml-auto">
                            {filtered.length} order(s)
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    ) : null}

                    {!loading && error ? (
                        <p className="text-sm text-red-600" role="alert">
                            {error}
                        </p>
                    ) : null}

                    {!loading && !error && filtered.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-600">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No orders yet.</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Open the editor on any project and click <span className="font-medium">Save product</span> to
                                create a draft order.
                            </p>
                        </div>
                    ) : null}

                    {!loading && filtered.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-indigo-200/70 dark:border-cyan-400/20">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-indigo-50/70 text-xs uppercase tracking-wide text-slate-600 dark:bg-cyan-500/10 dark:text-slate-300">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Order #</th>
                                        <th className="px-3 py-2 font-medium">Project</th>
                                        <th className="px-3 py-2 font-medium">Factory</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                        <th className="px-3 py-2 font-medium text-right">Units</th>
                                        <th className="px-3 py-2 font-medium text-right">Total</th>
                                        <th className="px-3 py-2 font-medium">Created</th>
                                        <th className="px-3 py-2 font-medium" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((order) => {
                                        const isOpen = expandedId === order.id;
                                        return (
                                            <React.Fragment key={order.id}>
                                                <tr className="border-t border-indigo-100/70 dark:border-cyan-400/10">
                                                    <td className="px-3 py-2 font-mono text-xs">#{order.id}</td>
                                                    <td className="px-3 py-2">{order.project_name || `Project #${order.project_id}`}</td>
                                                    <td className="px-3 py-2">
                                                        {order.factory_name || '—'}
                                                        {order.country_code ? (
                                                            <span className="ml-1 text-xs text-slate-500">({order.country_code})</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Badge
                                                            variant={STATUS_VARIANT[order.shipping_status] || 'secondary'}
                                                            className="capitalize"
                                                        >
                                                            {String(order.shipping_status || 'draft').replace(/_/g, ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">{totalUnits(order)}</td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        RM {Number(order.production_price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-slate-500">
                                                        {formatDate(order.created_at)}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {order.shipping_status === 'draft' ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSubmitProduction(order)}
                                                                    disabled={submittingId === order.id}
                                                                >
                                                                    {submittingId === order.id ? 'Submitting…' : 'Submit production'}
                                                                </Button>
                                                            ) : null}
                                                            {order.shipping_status === 'payment_pending' ? (
                                                                <Badge variant="warning">
                                                                    Payment pending
                                                                </Badge>
                                                            ) : null}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setExpandedId(isOpen ? null : order.id)}
                                                            >
                                                                {isOpen ? 'Hide lines' : 'Show lines'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openProject(order.project_id)}
                                                                className="gap-1"
                                                            >
                                                                Open project
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isOpen ? (
                                                    <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                                                        <td colSpan={8} className="px-3 py-3">
                                                            <table className="w-full text-xs">
                                                                <thead className="text-slate-500">
                                                                    <tr>
                                                                        <th className="px-2 py-1 text-left font-medium">Size</th>
                                                                        <th className="px-2 py-1 text-right font-medium">Qty</th>
                                                                        <th className="px-2 py-1 text-right font-medium">Unit (RM)</th>
                                                                        <th className="px-2 py-1 text-right font-medium">Line total (RM)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(order.lines || []).map((line) => (
                                                                        <tr key={`${order.id}-${line.size_code}`}>
                                                                            <td className="px-2 py-1 font-mono">{line.size_code}</td>
                                                                            <td className="px-2 py-1 text-right">{line.qty}</td>
                                                                            <td className="px-2 py-1 text-right">{Number(line.unit_price).toFixed(2)}</td>
                                                                            <td className="px-2 py-1 text-right font-medium">
                                                                                {Number(line.line_total).toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
