<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_user_cannot_exceed_three_active_projects(): void
    {
        $user = User::factory()->create(['role' => 'normal']);

        Sanctum::actingAs($user);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/projects', [
                'name' => 'Project '.$i,
                'country_code' => 'MY',
            ])->assertCreated();
        }

        $this->postJson('/api/projects', [
            'name' => 'Project overflow',
            'country_code' => 'MY',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Project slot limit reached.');
    }

    public function test_normal_user_generation_limit_is_five_per_project(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $project = $this->postJson('/api/projects', [
            'name' => 'Generation limited',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/api/projects/{$project}/generations", [
                'prompt' => 'Clean geometric eagle logo #'.$i,
            ])->assertAccepted();
        }

        $this->postJson("/api/projects/{$project}/generations", [
            'prompt' => 'overflow generation',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Generation limit reached for this project.');
    }

    public function test_user_can_list_update_and_delete_own_projects(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectId = $this->postJson('/api/projects', [
            'name' => 'Manageable Project',
            'country_code' => 'MY',
        ])->assertCreated()->json('project.id');

        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonPath('slots.limit', 3)
            ->assertJsonCount(1, 'projects');

        $this->patchJson("/api/projects/{$projectId}", [
            'name' => 'Managed Project',
            'status' => 'completed',
        ])->assertOk()
            ->assertJsonPath('project.name', 'Managed Project')
            ->assertJsonPath('project.status', 'completed');

        $this->deleteJson("/api/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_user_can_filter_sort_paginate_and_bulk_archive_projects(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $projectIds = [];
        foreach (['Alpha Kit', 'Beta Kit', 'Gamma Kit'] as $name) {
            $projectIds[] = $this->postJson('/api/projects', [
                'name' => $name,
                'country_code' => 'MY',
            ])->assertCreated()->json('project.id');
        }

        $this->patchJson("/api/projects/{$projectIds[1]}", [
            'name' => 'Beta Kit',
            'status' => 'completed',
        ])->assertOk();

        $this->getJson('/api/projects?search=Kit&status=active&sort_by=name&sort_dir=asc&per_page=5&page=1')
            ->assertOk()
            ->assertJsonPath('pagination.per_page', 5)
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonCount(2, 'projects')
            ->assertJsonPath('projects.0.name', 'Alpha Kit');

        $this->postJson('/api/projects/bulk', [
            'action' => 'archive',
            'project_ids' => [$projectIds[0], $projectIds[2]],
        ])->assertOk()
            ->assertJsonPath('action', 'archive')
            ->assertJsonPath('affected', 2);

        $this->assertDatabaseHas('projects', [
            'id' => $projectIds[0],
            'status' => 'archived',
        ]);
    }
}
