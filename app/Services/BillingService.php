<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Order;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Str;

class BillingService
{
    /** Monthly Freelancer subscription in MYR */
    public const FREELANCER_SUBSCRIPTION_MONTHLY = 300.0;

    public const FREELANCER_YEARLY_DISCOUNT_PERCENT = 10;

    /** @deprecated Use FREELANCER_SUBSCRIPTION_MONTHLY */
    public const FREELANCER_SUBSCRIPTION_AMOUNT = self::FREELANCER_SUBSCRIPTION_MONTHLY;

    public static function freelancerYearlyAmount(): float
    {
        return round(
            self::FREELANCER_SUBSCRIPTION_MONTHLY * 12 * (1 - self::FREELANCER_YEARLY_DISCOUNT_PERCENT / 100),
            2
        );
    }

    public static function freelancerSubscriptionChargeAmount(string $billingCycle): float
    {
        return $billingCycle === 'yearly'
            ? self::freelancerYearlyAmount()
            : self::FREELANCER_SUBSCRIPTION_MONTHLY;
    }

    public function createDownloadPayment(User $user, Project $project, string $channel, float $amount): Payment
    {
        return Payment::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'channel' => $channel,
            'purpose' => 'download',
            'amount' => $amount,
            'status' => 'pending',
        ]);
    }

    public function createProductionOrderPayment(User $user, Order $order, string $channel): Payment
    {
        return Payment::create([
            'project_id' => $order->project_id,
            'order_id' => $order->id,
            'user_id' => $user->id,
            'channel' => $channel,
            'purpose' => 'production_order',
            'amount' => (float) $order->production_price,
            'status' => 'pending',
        ]);
    }

    public function canUpgradeToFreelancer(User $user): bool
    {
        return $user->role === 'normal';
    }

    public function createFreelancerSubscriptionPayment(User $user, string $channel, string $billingCycle = 'monthly'): Payment
    {
        $billingCycle = $billingCycle === 'yearly' ? 'yearly' : 'monthly';
        $billingProject = Project::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->first();

        if (! $billingProject) {
            $billingProject = Project::create([
                'user_id' => $user->id,
                'name' => 'Freelancer Subscription',
                'country_code' => $user->country_code ?: 'MY',
                'status' => 'active',
            ]);
        }

        return Payment::create([
            'project_id' => $billingProject->id,
            'user_id' => $user->id,
            'channel' => $channel,
            'purpose' => 'freelancer_subscription',
            'amount' => self::freelancerSubscriptionChargeAmount($billingCycle),
            'status' => 'pending',
        ]);
    }

    public function hasPaidFreelancerSubscription(User $user): bool
    {
        return Payment::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'freelancer_subscription')
            ->where('status', 'paid')
            ->exists();
    }

    public function hasPaidDownload(Project $project): bool
    {
        return Payment::query()
            ->where('project_id', $project->id)
            ->where('status', 'paid')
            ->exists();
    }

    public function buildHighResDownloadUrl(Project $project, int $dpi): string
    {
        if ($project->generated_output_url) {
            return $project->generated_output_url.'?download=1&dpi='.$dpi;
        }

        return url('/downloads/'.$project->id.'/'.Str::slug($project->name).'-'.$dpi.'dpi.png');
    }
}
