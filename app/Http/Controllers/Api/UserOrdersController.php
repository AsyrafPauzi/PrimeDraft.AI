<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserOrdersController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::query()
            ->whereHas('project', fn ($query) => $query->where('user_id', $user->id))
            ->with(['project:id,name,country_code,scratch_layout', 'factory:id,name,country_code', 'lineItems', 'payments'])
            ->latest('created_at')
            ->limit(200)
            ->get()
            ->map(function (Order $order): array {
                /** @var Payment|null $productionPayment */
                $productionPayment = $order->payments
                    ->where('purpose', 'production_order')
                    ->sortByDesc('created_at')
                    ->first();

                return [
                    'id' => $order->id,
                    'project_id' => $order->project_id,
                    'project_name' => $order->project?->name,
                    'factory_id' => $order->factory_id,
                    'factory_name' => $order->factory?->name,
                    'country_code' => $order->factory?->country_code,
                    'shipping_status' => $order->shipping_status,
                    'production_price' => (float) $order->production_price,
                    'payment' => $productionPayment ? [
                        'id' => $productionPayment->id,
                        'channel' => $productionPayment->channel,
                        'amount' => (float) $productionPayment->amount,
                        'status' => $productionPayment->status,
                    ] : null,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'lines' => $order->lineItems->map(fn ($line): array => [
                        'size_code' => $line->size_code,
                        'qty' => (int) $line->qty,
                        'unit_price' => (float) $line->unit_price,
                        'line_total' => round((float) $line->qty * (float) $line->unit_price, 2),
                    ])->values()->all(),
                ];
            })
            ->all();

        return response()->json(['orders' => $orders]);
    }

    public function submitProduction(Request $request, Order $order, BillingService $billingService): JsonResponse
    {
        $order->loadMissing('project');
        abort_if($order->project?->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'channel' => ['required', 'in:billplz,stripe'],
        ]);

        if (! in_array($order->shipping_status, ['draft', 'payment_pending'], true)) {
            return response()->json([
                'message' => 'Only draft orders can be submitted for production payment.',
            ], 422);
        }

        /** @var Payment|null $payment */
        $payment = Payment::query()
            ->where('order_id', $order->id)
            ->where('purpose', 'production_order')
            ->where('status', 'pending')
            ->latest('id')
            ->first();

        if (! $payment) {
            $payment = $billingService->createProductionOrderPayment($request->user(), $order, $validated['channel']);
        }

        if ($order->shipping_status === 'draft') {
            $order->update(['shipping_status' => 'payment_pending']);
        }

        return response()->json([
            'order' => [
                'id' => $order->id,
                'shipping_status' => $order->fresh()->shipping_status,
            ],
            'payment' => $payment,
            'message' => 'Production payment initiated. Factory will receive the order after payment is marked paid.',
        ], 201);
    }
}
