<?php

namespace Tests\Feature\Feature;

use App\Models\Generation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditorCanvasImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_canvas_image_returns_data_url_when_openai_succeeds(): void
    {
        Config::set('openai.api_key', 'sk-test-fake');
        Config::set('openai.image_model', 'gpt-image-2');

        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $this->assertNotFalse($tinyPng);

        Http::fake([
            'https://api.openai.com/v1/images/generations' => Http::response([
                'data' => [
                    ['b64_json' => base64_encode($tinyPng)],
                ],
            ], 200),
        ]);

        $user = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Canvas AI',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/canvas-image", [
            'prompt' => 'Simple geometric icon',
            'fidelity' => 'sketch',
        ])
            ->assertOk()
            ->assertJsonStructure(['data_url']);

        $this->assertSame(1, Generation::query()->where('project_id', $project->id)->count());
    }

    public function test_canvas_image_rejects_blocked_prompt(): void
    {
        Config::set('openai.api_key', 'sk-test-fake');

        $user = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Canvas AI',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/canvas-image", [
            'prompt' => 'Design about counterfeit goods',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['prompt']);
    }

    public function test_canvas_image_requires_auth(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'X',
            'country_code' => 'MY',
        ]);

        $this->postJson("/api/projects/{$project->id}/editor/canvas-image", [
            'prompt' => 'Test',
        ])->assertUnauthorized();
    }
}
