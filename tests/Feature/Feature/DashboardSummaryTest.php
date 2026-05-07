<?php

namespace Tests\Feature\Feature;

use App\Models\Generation;
use App\Models\Payment;
use App\Models\PrintFile;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_get_live_dashboard_summary(): void
    {
        $user = User::factory()->create(['role' => 'normal']);
        Sanctum::actingAs($user);

        $project = Project::query()->create([
            'user_id' => $user->id,
            'name' => 'Dashboard Demo Project',
            'country_code' => 'MY',
            'status' => 'active',
        ]);

        Generation::query()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'prompt' => 'Generate modern jersey concept',
            'provider' => 'mock',
            'status' => 'queued',
            'cost' => 0,
        ]);

        Payment::query()->create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'channel' => 'billplz',
            'purpose' => 'download',
            'amount' => 19,
            'status' => 'pending',
        ]);

        PrintFile::query()->create([
            'project_id' => $project->id,
            'dpi' => 360,
            'color_count' => 6,
            'is_valid' => true,
            'validation_errors' => [],
        ]);

        $this->getJson('/api/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('summary.total_projects', 1)
            ->assertJsonPath('summary.active_projects', 1)
            ->assertJsonPath('summary.pending_downloads', 1)
            ->assertJsonPath('summary.valid_print_files', 1)
            ->assertJsonStructure([
                'summary' => [
                    'pipeline_health',
                    'qa_pass_rate',
                    'latest_project_id',
                ],
                'activities',
            ]);
    }
}
