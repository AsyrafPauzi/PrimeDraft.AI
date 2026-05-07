<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PrintFile;
use App\Models\Project;
use App\Services\BillingService;
use App\Services\PrintValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function subscriptionStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'freelancer') {
            return response()->json([
                'plan' => 'freelancer',
                'status' => 'active',
                'label' => 'Freelancer Active',
            ]);
        }

        $latestSubscriptionPayment = Payment::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'freelancer_subscription')
            ->latest('created_at')
            ->first();

        if ($latestSubscriptionPayment && $latestSubscriptionPayment->status === 'pending') {
            return response()->json([
                'plan' => 'normal',
                'status' => 'pending',
                'label' => 'Subscription Pending',
            ]);
        }

        return response()->json([
            'plan' => $user->role,
            'status' => 'upgrade_available',
            'label' => $user->role === 'normal' ? 'Upgrade Available' : ucfirst((string) $user->role),
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        $payments = Payment::query()
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->get(['id', 'project_id', 'channel', 'purpose', 'amount', 'status', 'created_at']);

        $projectIds = $payments->pluck('project_id')->unique()->values();
        $projectNames = Project::query()
            ->whereIn('id', $projectIds)
            ->pluck('name', 'id');

        $paymentHistory = $payments->map(fn (Payment $payment): array => [
            'id' => $payment->id,
            'project_id' => $payment->project_id,
            'project_name' => $projectNames[$payment->project_id] ?? null,
            'channel' => $payment->channel,
            'purpose' => $payment->purpose,
            'amount' => (float) $payment->amount,
            'status' => $payment->status,
            'created_at' => optional($payment->created_at)->toIso8601String(),
        ]);

        $downloadHistory = PrintFile::query()
            ->whereIn('project_id', $projectIds)
            ->latest('created_at')
            ->get(['id', 'project_id', 'dpi', 'color_count', 'is_valid', 'created_at'])
            ->map(fn (PrintFile $file): array => [
                'id' => $file->id,
                'project_id' => $file->project_id,
                'project_name' => $projectNames[$file->project_id] ?? null,
                'dpi' => $file->dpi,
                'color_count' => $file->color_count,
                'is_valid' => $file->is_valid,
                'created_at' => optional($file->created_at)->toIso8601String(),
            ]);

        return response()->json([
            'payments' => $paymentHistory,
            'downloads' => $downloadHistory,
        ]);
    }

    public function verifyFreelancerUpgrade(Request $request, BillingService $billingService): JsonResponse
    {
        $user = $request->user();
        $eligible = $billingService->canUpgradeToFreelancer($user);
        $alreadySubscribed = $billingService->hasPaidFreelancerSubscription($user);

        return response()->json([
            'eligible' => $eligible,
            'already_subscribed' => $alreadySubscribed,
            'currency' => 'MYR',
            'required_amount' => BillingService::FREELANCER_SUBSCRIPTION_MONTHLY,
            'monthly_amount' => BillingService::FREELANCER_SUBSCRIPTION_MONTHLY,
            'yearly_amount' => BillingService::freelancerYearlyAmount(),
            'yearly_discount_percent' => BillingService::FREELANCER_YEARLY_DISCOUNT_PERCENT,
            'benefits' => [
                'Access freelancer dashboard and client workspace',
                'Priority design revision workflow',
                'Freelancer project/client management pages',
            ],
            'message' => $alreadySubscribed
                ? 'Subscription already active.'
                : ($eligible ? 'Eligible for freelancer upgrade.' : 'Only normal users can upgrade to freelancer.'),
        ]);
    }

    public function checkoutFreelancerSubscription(Request $request, BillingService $billingService): JsonResponse
    {
        $validated = $request->validate([
            'channel' => ['required', 'in:billplz,stripe'],
            'billing_cycle' => ['sometimes', 'in:monthly,yearly'],
        ]);

        $user = $request->user();

        if (! $billingService->canUpgradeToFreelancer($user)) {
            return response()->json(['message' => 'Only normal users can upgrade to freelancer.'], 422);
        }

        $billingCycle = $validated['billing_cycle'] ?? 'monthly';
        $payment = $billingService->createFreelancerSubscriptionPayment($user, $validated['channel'], $billingCycle);

        return response()->json([
            'payment' => $payment,
            'message' => 'Subscription checkout initiated. Role upgrades after payment is verified.',
        ], 201);
    }

    public function checkoutDownload(Request $request, Project $project, BillingService $billingService): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'channel' => ['required', 'in:billplz,stripe'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $payment = $billingService->createDownloadPayment(
            $request->user(),
            $project,
            $validated['channel'],
            (float) $validated['amount']
        );

        return response()->json(['payment' => $payment], 201);
    }

    public function downloadAccess(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $downloadEnabled = Payment::query()->where('project_id', $project->id)->where('status', 'paid')->exists();

        return response()->json(['download_enabled' => $downloadEnabled]);
    }

    public function downloadHighRes(
        Request $request,
        Project $project,
        BillingService $billingService,
        PrintValidationService $printValidationService
    ): JsonResponse {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'dpi' => ['required', 'integer', 'min:360'],
            'color_count' => ['nullable', 'integer', 'min:1'],
        ]);

        if (! $billingService->hasPaidDownload($project)) {
            return response()->json(['message' => 'Payment required before high-res download.'], 402);
        }

        $dpi = (int) $validated['dpi'];
        $colorCount = (int) ($validated['color_count'] ?? 6);
        $validation = $printValidationService->validate($dpi, $colorCount);

        PrintFile::create([
            'project_id' => $project->id,
            'dpi' => $dpi,
            'color_count' => $colorCount,
            'is_valid' => $validation['valid'],
            'validation_errors' => $validation['errors'],
        ]);

        if (! $validation['valid']) {
            return response()->json([
                'message' => 'Print validation failed.',
                'errors' => $validation['errors'],
            ], 422);
        }

        return response()->json([
            'download_url' => $billingService->buildHighResDownloadUrl($project, $dpi),
            'dpi' => $dpi,
            'message' => 'High-resolution download is ready.',
        ]);
    }
}
