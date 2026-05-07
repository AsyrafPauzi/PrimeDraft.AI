<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EditorController extends Controller
{
    public function saveScratch(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'layout' => ['required', 'array'],
        ]);

        $project->update([
            'scratch_layout' => $validated['layout'],
        ]);

        return response()->json(['project' => $project->fresh()]);
    }

    public function splitPreview(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        return response()->json([
            'scratch' => $project->scratch_layout ?? [],
            'generated' => [
                'output_url' => $project->generated_output_url,
            ],
        ]);
    }
}
