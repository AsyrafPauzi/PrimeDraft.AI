<?php

namespace Tests\Feature\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditorImagePipelineTest extends TestCase
{
    use RefreshDatabase;

    private function tinyPngDataUrl(): string
    {
        $b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

        return 'data:image/png;base64,'.$b64;
    }

    public function test_upscale_endpoint_returns_png_data_url(): void
    {
        if (! function_exists('imagecreatefromstring')) {
            $this->markTestSkipped('GD extension not available.');
        }

        $user = User::factory()->create(['role' => 'normal']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Pipe',
            'country_code' => 'MY',
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/pipeline/upscale", [
            'image_base64' => $this->tinyPngDataUrl(),
        ])
            ->assertOk()
            ->assertJsonStructure(['data_url']);
    }

    public function test_vectorize_returns_svg(): void
    {
        if (! function_exists('imagecreatefromstring')) {
            $this->markTestSkipped('GD extension not available.');
        }

        $user = User::factory()->create(['role' => 'normal']);
        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Vec',
            'country_code' => 'MY',
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/projects/{$project->id}/editor/pipeline/vectorize", [
            'image_base64' => $this->tinyPngDataUrl(),
        ])
            ->assertOk()
            ->assertJsonStructure(['svg', 'method']);
    }
}
