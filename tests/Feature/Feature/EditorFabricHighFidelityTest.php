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

class EditorFabricHighFidelityTest extends TestCase
{
    use RefreshDatabase;

    public function test_fabric_high_fidelity_returns_data_url_when_openai_generations_succeeds(): void
    {
        Config::set('openai.api_key', 'sk-test-fake');
        Config::set('openai.image_model', 'gpt-image-2');
        Config::set('openai.image_edit_model', null);

        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $this->assertNotFalse($tinyPng);
        $preview = 'data:image/png;base64,'.base64_encode($tinyPng);

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
            'name' => 'Fabric',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/fabric-high-fidelity", [
            'prompt' => 'Bold mascot emblem for a sports tee',
            'preview_png' => $preview,
            'fabric_json' => ['version' => '5.3.0', 'objects' => []],
        ])
            ->assertOk()
            ->assertJsonStructure(['data_url']);

        $this->assertSame(1, Generation::query()->where('project_id', $project->id)->where('provider', 'openai_fabric_hf')->count());
    }

    public function test_fabric_high_fidelity_rejects_blocked_prompt(): void
    {
        Config::set('openai.api_key', 'sk-test-fake');

        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', true);
        $this->assertNotFalse($tinyPng);
        $preview = 'data:image/png;base64,'.base64_encode($tinyPng);

        $user = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Fabric',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/fabric-high-fidelity", [
            'prompt' => 'Design about counterfeit goods',
            'preview_png' => $preview,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['prompt']);
    }

    public function test_fabric_high_fidelity_requires_auth(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'X',
            'country_code' => 'MY',
        ]);

        $this->postJson("/api/projects/{$project->id}/editor/fabric-high-fidelity", [
            'prompt' => 'Test',
            'preview_png' => 'data:image/png;base64,',
        ])->assertUnauthorized();
    }
}
