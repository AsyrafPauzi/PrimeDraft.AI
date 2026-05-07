<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessGenerationJob;
use App\Models\Generation;
use App\Models\Project;
use App\Services\PromptPolicyService;
use App\Services\SlotPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GenerationController extends Controller
{
    public function store(
        Request $request,
        Project $project,
        PromptPolicyService $promptPolicyService,
        SlotPolicyService $slotPolicyService
    ): JsonResponse {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'prompt' => ['required', 'string'],
        ]);

        $promptPolicyService->assertValid($validated['prompt']);

        $max = $slotPolicyService->maxGenerationsFor($request->user());
        $current = Generation::query()->where('project_id', $project->id)->count();
        if ($current >= $max) {
            return response()->json(['message' => 'Generation limit reached for this project.'], 422);
        }

        $generation = Generation::create([
            'project_id' => $project->id,
            'user_id' => $request->user()->id,
            'prompt' => $validated['prompt'],
            'provider' => 'mock',
            'status' => 'queued',
        ]);

        ProcessGenerationJob::dispatch($generation->id);

        return response()->json(['generation' => $generation], 202);
    }
}
