<?php

namespace Tests\Feature\Feature;

use App\Models\Payment;
use App\Models\PrintFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingAndFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_billplz_webhook_marks_payment_and_unlocks_download(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);
        config(['services.billplz.webhook_secret' => 'billplz-secret']);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Billing flow',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $paymentId = $this->postJson("/api/projects/{$projectId}/downloads/checkout", [
            'channel' => 'billplz',
            'amount' => 50,
        ])->assertCreated()->json('payment.id');

        $payload = [
            'payment_id' => $paymentId,
            'status' => 'paid',
        ];

        $signature = hash_hmac('sha256', json_encode($payload), 'billplz-secret');

        $this->withHeader('X-Billplz-Signature', $signature)
            ->postJson('/api/webhooks/billplz', $payload)
            ->assertOk();

        $this->getJson("/api/projects/{$projectId}/downloads/access")
            ->assertOk()
            ->assertJsonPath('download_enabled', true);
    }

    public function test_billplz_webhook_rejects_invalid_signature(): void
    {
        $this->withHeader('X-Billplz-Signature', 'invalid')
            ->postJson('/api/webhooks/billplz', [
                'payment_id' => 999,
                'status' => 'paid',
            ])->assertUnauthorized();
    }

    public function test_checkout_returns_factories_matching_user_country(): void
    {
        $user = User::factory()->create([
            'role' => 'normal',
            'country_code' => 'ID',
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/factories/matching')
            ->assertOk()
            ->assertJsonPath('country_code', 'ID');
    }

    public function test_high_res_download_requires_paid_access_and_returns_url_after_payment(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'High Res Download',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $this->postJson("/api/projects/{$projectId}/downloads/high-res", [
            'dpi' => 360,
            'color_count' => 6,
        ])->assertStatus(402);

        Payment::query()->create([
            'project_id' => $projectId,
            'user_id' => $user->id,
            'channel' => 'billplz',
            'purpose' => 'download',
            'amount' => 19,
            'status' => 'paid',
        ]);

        $this->postJson("/api/projects/{$projectId}/downloads/high-res", [
            'dpi' => 360,
            'color_count' => 6,
        ])->assertOk()
            ->assertJsonPath('dpi', 360)
            ->assertJsonStructure(['download_url']);
    }

    public function test_normal_user_can_verify_and_start_freelancer_subscription_checkout(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $this->getJson('/api/billing/subscription/verify')
            ->assertOk()
            ->assertJsonPath('eligible', true)
            ->assertJsonPath('already_subscribed', false)
            ->assertJsonPath('monthly_amount', 300)
            ->assertJsonPath('yearly_amount', 3240)
            ->assertJsonPath('yearly_discount_percent', 10)
            ->assertJsonStructure(['required_amount', 'benefits']);

        $this->postJson('/api/billing/subscription/checkout', [
            'channel' => 'billplz',
        ])->assertCreated()
            ->assertJsonPath('payment.purpose', 'freelancer_subscription')
            ->assertJsonPath('payment.status', 'pending')
            ->assertJsonPath('payment.amount', 300);

        $this->postJson('/api/billing/subscription/checkout', [
            'channel' => 'billplz',
            'billing_cycle' => 'yearly',
        ])->assertCreated()
            ->assertJsonPath('payment.amount', 3240);
    }

    public function test_webhook_upgrades_user_role_after_freelancer_subscription_payment(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);
        config(['services.billplz.webhook_secret' => 'billplz-secret']);

        $paymentId = $this->postJson('/api/billing/subscription/checkout', [
            'channel' => 'billplz',
        ])->assertCreated()->json('payment.id');

        $payload = [
            'payment_id' => $paymentId,
            'status' => 'paid',
        ];
        $signature = hash_hmac('sha256', json_encode($payload), 'billplz-secret');

        $this->withHeader('X-Billplz-Signature', $signature)
            ->postJson('/api/webhooks/billplz', $payload)
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'freelancer',
        ]);
    }

    public function test_user_can_view_billing_and_high_res_download_history(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'History Demo Project',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        Payment::query()->create([
            'project_id' => $projectId,
            'user_id' => $user->id,
            'channel' => 'billplz',
            'purpose' => 'download',
            'amount' => 19,
            'status' => 'paid',
        ]);

        PrintFile::query()->create([
            'project_id' => $projectId,
            'dpi' => 360,
            'color_count' => 6,
            'is_valid' => true,
            'validation_errors' => [],
        ]);

        $this->getJson('/api/billing/history')
            ->assertOk()
            ->assertJsonCount(1, 'payments')
            ->assertJsonCount(1, 'downloads')
            ->assertJsonPath('payments.0.purpose', 'download')
            ->assertJsonPath('downloads.0.dpi', 360);
    }

    public function test_subscription_status_endpoint_returns_pending_for_normal_user_with_pending_subscription(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Subscription Status Project',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        Payment::query()->create([
            'project_id' => $projectId,
            'user_id' => $user->id,
            'channel' => 'billplz',
            'purpose' => 'freelancer_subscription',
            'amount' => 300,
            'status' => 'pending',
        ]);

        $this->getJson('/api/billing/subscription/status')
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('label', 'Subscription Pending');
    }
}
