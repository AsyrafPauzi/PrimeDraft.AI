<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrintFile;
use App\Models\Project;
use App\Services\PrintValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrintValidationController extends Controller
{
    public function validateFile(Request $request, Project $project, PrintValidationService $printValidationService): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'dpi' => ['required', 'integer'],
            'color_count' => ['required', 'integer'],
        ]);

        $result = $printValidationService->validate($validated['dpi'], $validated['color_count']);

        PrintFile::create([
            'project_id' => $project->id,
            'dpi' => $validated['dpi'],
            'color_count' => $validated['color_count'],
            'is_valid' => $result['valid'],
            'validation_errors' => $result['errors'],
        ]);

        if (! $result['valid']) {
            return response()->json([
                'message' => 'Print validation failed.',
                'errors' => $result['errors'],
            ], 422);
        }

        return response()->json(['message' => 'Print file validated.']);
    }
}
