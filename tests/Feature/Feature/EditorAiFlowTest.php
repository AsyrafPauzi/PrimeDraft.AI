<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditorAiFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_editor_can_save_scratch_layout_and_show_split_preview(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Editor flow',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $this->postJson("/api/projects/{$projectId}/editor/scratch", [
            'layout' => [
                'objects' => [
                    ['type' => 'text', 'text' => 'PrimeDraft'],
                ],
                'canvas' => ['width' => 1200, 'height' => 1400],
            ],
        ])->assertOk()
            ->assertJsonPath('project.scratch_layout.objects.0.text', 'PrimeDraft');

        $preview = $this->getJson("/api/projects/{$projectId}/editor/split-preview");

        $preview->assertOk()
            ->assertJsonStructure([
                'scratch',
                'generated',
            ]);
    }
}
