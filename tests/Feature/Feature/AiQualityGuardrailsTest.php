<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiQualityGuardrailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_prompt_preflight_rejects_excessively_long_prompt(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Prompt checks',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $this->postJson("/api/projects/{$projectId}/generations", [
            'prompt' => str_repeat('x', 501),
        ])->assertStatus(422);
    }

    public function test_generation_request_is_queued_and_dpi_rule_is_enforced(): void
    {
        Queue::fake();

        $user = User::factory()->create(['role' => 'freelancer']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Quality checks',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $this->postJson("/api/projects/{$projectId}/generations", [
            'prompt' => 'High fidelity tiger logo',
        ])->assertAccepted();

        $this->postJson("/api/projects/{$projectId}/print-files/validate", [
            'dpi' => 300,
            'color_count' => 10,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Print validation failed.');
    }
}
