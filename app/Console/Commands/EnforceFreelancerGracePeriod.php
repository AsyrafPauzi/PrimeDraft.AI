<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\Subscription;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:enforce-freelancer-grace-period')]
#[Description('Command description')]
class EnforceFreelancerGracePeriod extends Command
{
    public function handle()
    {
        Subscription::query()
            ->where('status', 'expired')
            ->whereNotNull('grace_ends_at')
            ->each(function (Subscription $subscription): void {
                $projects = Project::query()
                    ->where('user_id', $subscription->user_id)
                    ->latest('updated_at')
                    ->get();

                $extra = $projects->slice(3);

                if (now()->lessThanOrEqualTo($subscription->grace_ends_at)) {
                    Project::query()->whereIn('id', $extra->pluck('id'))->update([
                        'status' => 'locked',
                        'locked_at' => now(),
                    ]);

                    return;
                }

                Project::query()->whereIn('id', $extra->pluck('id'))->delete();
            });

        $this->info('Freelancer grace period rules enforced.');
    }
}
