<?php

namespace Tests\Feature\Feature;

use App\Models\Factory;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PreflightApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_preflight_persists_report(): void
    {
        $user = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'P1',
            'country_code' => 'MY',
            'scratch_layout' => [
                'version' => 1,
                'sides' => [
                    'Front' => [
                        'layers' => [
                            [
                                'id' => 'a',
                                'type' => 'text',
                                'zIndex' => 1,
                                'transform' => ['x' => 0.2, 'y' => 0.2, 'w' => 0.5, 'h' => 0.2, 'rotation' => 0],
                                'props' => ['text' => 'Hi', 'fontSizePx' => 18, 'color' => '#111827'],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/preflight", ['print_profile' => 'dtf'])
            ->assertOk()
            ->assertJsonPath('preflight.profile', 'dtf')
            ->assertJsonPath('project.print_profile', 'dtf');

        $project->refresh();
        $this->assertIsArray($project->preflight_report);
        $this->assertArrayHasKey('status', $project->preflight_report);
    }

    public function test_submit_production_blocked_when_preflight_error(): void
    {
        $user = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $factory = Factory::query()->create([
            'user_id' => $factoryUser->id,
            'name' => 'F1',
            'country_code' => 'MY',
            'base_price' => 20,
            'active' => true,
        ]);

        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'P2',
            'country_code' => 'MY',
            'preflight_report' => [
                'status' => 'error',
                'issues' => [['id' => 'x', 'severity' => 'error', 'message' => 'bad']],
                'profile' => 'screen',
                'generated_at' => now()->toIso8601String(),
                'preflight_version' => 1,
            ],
        ]);

        $order = Order::query()->create([
            'project_id' => $project->id,
            'factory_id' => $factory->id,
            'production_price' => 10,
            'platform_margin' => 0,
            'shipping_status' => 'draft',
        ]);

        Payment::query()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'order_id' => $order->id,
            'purpose' => 'production_order',
            'channel' => 'billplz',
            'amount' => 10,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/orders/{$order->id}/submit-production", ['channel' => 'billplz'])
            ->assertStatus(422)
            ->assertJsonFragment(['preflight_status' => 'error']);
    }
}
