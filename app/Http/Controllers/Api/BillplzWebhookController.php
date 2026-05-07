<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillplzWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $secret = (string) config('services.billplz.webhook_secret');
        $incomingSignature = (string) $request->header('X-Billplz-Signature', '');
        $computedSignature = hash_hmac('sha256', $request->getContent(), $secret);

        if ($secret === '' || ! hash_equals($computedSignature, $incomingSignature)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $validated = $request->validate([
            'payment_id' => ['required', 'integer'],
            'status' => ['required', 'string'],
        ]);

        $payment = Payment::findOrFail($validated['payment_id']);
        $payment->update(['status' => $validated['status']]);

        if ($payment->purpose === 'freelancer_subscription' && $payment->status === 'paid') {
            User::query()->where('id', $payment->user_id)->update(['role' => 'freelancer']);
        }

        if ($payment->purpose === 'production_order' && $payment->status === 'paid' && $payment->order_id) {
            $payment->order()->update(['shipping_status' => 'pending_production']);
        }

        return response()->json(['ok' => true]);
    }
}
