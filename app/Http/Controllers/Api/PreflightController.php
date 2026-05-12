<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\PreflightService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PreflightController extends Controller
{
    public function store(Request $request, Project $project, PreflightService $preflightService): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'print_profile' => ['nullable', 'string', 'in:dtf,screen,sublimation'],
            'layout' => ['nullable', 'array'],
        ]);

        $profile = $validated['print_profile'] ?? $project->print_profile ?? 'dtf';
        $layout = $validated['layout'] ?? $project->scratch_layout;

        $report = $preflightService->run(is_array($layout) ? $layout : null, $profile);

        $project->update([
            'print_profile' => $profile,
            'preflight_report' => $report,
        ]);

        Log::info('preflight.completed', [
            'project_id' => $project->id,
            'status' => $report['status'] ?? null,
            'profile' => $report['profile'] ?? null,
            'issue_count' => isset($report['issues']) && is_array($report['issues']) ? count($report['issues']) : 0,
        ]);

        return response()->json([
            'preflight' => $report,
            'project' => $project->fresh(),
        ]);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        return response()->json([
            'preflight' => $project->preflight_report,
            'print_profile' => $project->print_profile,
        ]);
    }
}
