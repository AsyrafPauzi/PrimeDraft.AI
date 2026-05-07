import React, { useEffect, useState } from 'react';
import { getFactoryOrders } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';

const STATUS_LABEL = {
    pending_production: 'New paid order',
    in_production: 'In production',
    shipped: 'Shipped',
    delivered: 'Delivered',
};

export function FactoryOrdersPage({ token, onNotify }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function loadOrders() {
        setLoading(true);
        setError('');
        try {
            const payload = await getFactoryOrders(token);
            setOrders(payload.orders || []);
            onNotify?.('Factory orders refreshed.', 'success');
        } catch (requestError) {
            setError(requestError.message);
            onNotify?.(requestError.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Factory Orders</CardTitle>
                <CardDescription>Production queue endpoint: `/api/factory/orders`.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <Button variant="outline" onClick={loadOrders} disabled={loading}>
                    Refresh Orders
                </Button>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : null}
                {!loading && orders.length === 0 ? <p className="text-sm text-gray-600">No paid production orders yet.</p> : null}
                {!loading && orders.length > 0 ? (
                    <ul className="space-y-2">
                        {orders.map((order) => (
                            <li key={order.id} className="rounded border p-3 text-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">Order #{order.id}</p>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {order.project_name || `Project #${order.project_id}`} · RM {Number(order.production_price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <Badge variant={order.shipping_status === 'pending_production' ? 'warning' : 'secondary'}>
                                        {STATUS_LABEL[order.shipping_status] || order.shipping_status}
                                    </Badge>
                                </div>
                                {order.lines?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                                        {order.lines.map((line) => (
                                            <span key={`${order.id}-${line.size_code}`} className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
                                                {line.size_code} × {line.qty}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : null}
                {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
            </CardContent>
        </Card>
    );
}
