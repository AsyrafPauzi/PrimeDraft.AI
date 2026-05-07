import React, { useEffect, useState } from 'react';
import { getBillingHistory } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { CreditCard, Download, RefreshCw, Receipt, Clock, CheckCircle2, XCircle, AlertCircle, TrendingUp } from 'lucide-react';

function StatusBadge({ status }) {
    const map = {
        paid: { label: 'Paid', variant: 'success', icon: CheckCircle2 },
        pending: { label: 'Pending', variant: 'warning', icon: Clock },
        failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
        cancelled: { label: 'Cancelled', variant: 'secondary', icon: XCircle },
    };
    const config = map[status?.toLowerCase()] || { label: status || '-', variant: 'secondary', icon: AlertCircle };
    const Icon = config.icon;
    return (
        <Badge variant={config.variant} className="inline-flex items-center gap-1 capitalize">
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}

function formatDate(iso) {
    if (!iso) {
        return '-';
    }
    try {
        return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return iso;
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) {
        return '-';
    }
    return `RM ${Number(amount).toFixed(2)}`;
}

export function BillingPage({ token, onNotify }) {
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [downloadHistory, setDownloadHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function loadHistory() {
        setLoading(true);
        setError('');
        try {
            const payload = await getBillingHistory(token);
            setPaymentHistory(Array.isArray(payload.payments) ? payload.payments : []);
            setDownloadHistory(Array.isArray(payload.downloads) ? payload.downloads : []);
        } catch (requestError) {
            setError(requestError?.message || 'Failed to load billing history.');
        } finally {
            setLoading(false);
        }
    }

    const totalSpend = paymentHistory
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const paidCount = paymentHistory.filter((p) => p.status === 'paid').length;
    const pendingCount = paymentHistory.filter((p) => p.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Billing</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Your payment history, subscriptions, and print file records.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading} className="gap-1.5">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            ) : null}

            {/* Summary KPI cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                            <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Spend</p>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                {loading ? <Skeleton className="h-6 w-20" /> : formatCurrency(totalSpend)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Completed Orders</p>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                {loading ? <Skeleton className="h-6 w-10" /> : paidCount}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Print Files Downloaded</p>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-50">
                                {loading ? <Skeleton className="h-6 w-10" /> : downloadHistory.length}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <CardTitle>Transaction History</CardTitle>
                    </div>
                    <CardDescription>All payment orders linked to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
                        </div>
                    ) : paymentHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Receipt className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No transactions yet</p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                Payments for project downloads and subscriptions will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800">
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Description</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Project</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Channel</th>
                                        <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="border-b border-gray-50 last:border-0 dark:border-gray-800/50"
                                        >
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                                                {formatDate(payment.created_at)}
                                            </td>
                                            <td className="py-3 pr-4 font-medium capitalize text-gray-800 dark:text-gray-100">
                                                {payment.purpose?.replace(/_/g, ' ') || 'Payment'}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                                                {payment.project_name || (payment.project_id ? `#${payment.project_id}` : '—')}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 capitalize">
                                                {payment.channel || '-'}
                                            </td>
                                            <td className="py-3 pr-4 text-right font-semibold text-gray-900 dark:text-gray-50">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="py-3">
                                                <StatusBadge status={payment.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Print File Download History */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <CardTitle>Print File History</CardTitle>
                    </div>
                    <CardDescription>
                        High-resolution print files downloaded from your projects.
                        {pendingCount > 0 ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Clock className="h-3 w-3" />
                                {pendingCount} pending payment(s)
                            </span>
                        ) : null}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
                        </div>
                    ) : downloadHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Download className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No print files yet</p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                Download a high-res print file from your Projects page to see it here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800">
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Project</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">DPI</th>
                                        <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Colours</th>
                                        <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Validation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {downloadHistory.map((file) => (
                                        <tr
                                            key={file.id}
                                            className="border-b border-gray-50 last:border-0 dark:border-gray-800/50"
                                        >
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                                                {formatDate(file.created_at)}
                                            </td>
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-100">
                                                {file.project_name || (file.project_id ? `#${file.project_id}` : '—')}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                                                {file.dpi ? `${file.dpi} DPI` : '-'}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                                                {file.color_count ?? '-'}
                                            </td>
                                            <td className="py-3">
                                                {file.is_valid ? (
                                                    <Badge variant="success" className="inline-flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Passed
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" className="inline-flex items-center gap-1">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Review needed
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
