<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Generation;
use App\Models\Payment;
use App\Models\PrintFile;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        $projectQuery = Project::query()->where('user_id', $user->id);
        $projectIds = (clone $projectQuery)->pluck('id');

        $totalProjects = (clone $projectQuery)->count();
        $activeProjects = (clone $projectQuery)->where('status', 'active')->count();
        $completedProjects = (clone $projectQuery)->where('status', 'completed')->count();
        $latestProjectId = (clone $projectQuery)->latest('updated_at')->value('id');

        $generationQuery = Generation::query()->whereIn('project_id', $projectIds);
        $queuedGenerations = (clone $generationQuery)->where('status', 'queued')->count();
        $completedGenerations = (clone $generationQuery)->where('status', 'completed')->count();

        $downloadPaymentQuery = Payment::query()
            ->where('user_id', $user->id)
            ->where('purpose', 'download');
        $paidDownloads = (clone $downloadPaymentQuery)->where('status', 'paid')->count();
        $pendingDownloads = (clone $downloadPaymentQuery)->where('status', 'pending')->count();

        $printQuery = PrintFile::query()->whereIn('project_id', $projectIds);
        $validPrintFiles = (clone $printQuery)->where('is_valid', true)->count();
        $invalidPrintFiles = (clone $printQuery)->where('is_valid', false)->count();

        $activityProjects = Project::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->take(4)
            ->get(['name', 'status', 'updated_at'])
            ->map(fn (Project $project): array => [
                'type' => 'project',
                'message' => sprintf('Project %s is currently %s.', $project->name, $project->status),
                'timestamp' => optional($project->updated_at)->toIso8601String(),
            ]);

        $activityGenerations = Generation::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->take(4)
            ->get(['status', 'updated_at', 'project_id'])
            ->map(fn (Generation $generation): array => [
                'type' => 'generation',
                'message' => sprintf('Generation for project #%d is %s.', $generation->project_id, $generation->status),
                'timestamp' => optional($generation->updated_at)->toIso8601String(),
            ]);

        $activityPayments = Payment::query()
            ->where('user_id', $user->id)
            ->latest('updated_at')
            ->take(4)
            ->get(['status', 'amount', 'updated_at'])
            ->map(fn (Payment $payment): array => [
                'type' => 'payment',
                'message' => sprintf('Download payment %.2f is %s.', $payment->amount, $payment->status),
                'timestamp' => optional($payment->updated_at)->toIso8601String(),
            ]);

        $activities = $activityProjects
            ->concat($activityGenerations)
            ->concat($activityPayments)
            ->sortByDesc('timestamp')
            ->take(6)
            ->values();

        $pipelineHealth = $totalProjects > 0
            ? (int) round((($completedGenerations + $validPrintFiles + 1) / ($queuedGenerations + $invalidPrintFiles + $totalProjects + 1)) * 100)
            : 0;
        $pipelineHealth = max(0, min(100, $pipelineHealth));

        $qaPassRate = ($validPrintFiles + $invalidPrintFiles) > 0
            ? (int) round(($validPrintFiles / ($validPrintFiles + $invalidPrintFiles)) * 100)
            : 0;

        return response()->json([
            'summary' => [
                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'completed_projects' => $completedProjects,
                'queued_generations' => $queuedGenerations,
                'completed_generations' => $completedGenerations,
                'paid_downloads' => $paidDownloads,
                'pending_downloads' => $pendingDownloads,
                'valid_print_files' => $validPrintFiles,
                'invalid_print_files' => $invalidPrintFiles,
                'pipeline_health' => $pipelineHealth,
                'qa_pass_rate' => $qaPassRate,
                'latest_project_id' => $latestProjectId,
            ],
            'activities' => $activities,
        ]);
    }
}
