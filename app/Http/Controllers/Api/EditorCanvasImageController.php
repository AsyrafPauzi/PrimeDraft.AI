<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Generation;
use App\Models\Project;
use App\Services\MerchandiseAiPromptGuardService;
use App\Services\OpenAi\OpenAiImageClient;
use App\Services\PromptPolicyService;
use App\Services\SlotPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EditorCanvasImageController extends Controller
{
    public function store(
        Request $request,
        Project $project,
        OpenAiImageClient $openAiImageClient,
        PromptPolicyService $promptPolicyService,
        MerchandiseAiPromptGuardService $merchandiseGuard,
        SlotPolicyService $slotPolicyService
    ): JsonResponse {
        abort_if($project->user_id !== $request->user()->id, 403);

        $maxPrompt = (int) config('ai_print_guard.max_user_prompt_chars', 500);

        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:'.$maxPrompt],
            'fidelity' => ['nullable', 'string', 'in:sketch,draft,balanced,print'],
            'size' => ['nullable', 'string', 'max:32'],
            'quality' => ['nullable', 'string', 'in:auto,low,medium,high'],
            'factory_id' => ['nullable', 'integer', 'exists:factories,id'],
        ]);

        $promptPolicyService->assertValid($validated['prompt']);

        $max = $slotPolicyService->maxGenerationsFor($request->user());
        $current = Generation::query()->where('project_id', $project->id)->count();
        if ($current >= $max) {
            return response()->json(['message' => 'Generation limit reached for this project.'], 422);
        }

        $fidelity = $validated['fidelity'] ?? 'balanced';
        $factoryId = isset($validated['factory_id']) ? (int) $validated['factory_id'] : null;
        $fullPrompt = $merchandiseGuard->wrapForOpenAiImageGeneration($validated['prompt'], $fidelity, $factoryId);

        $quality = $validated['quality'] ?? match ($fidelity) {
            'sketch' => 'low',
            'draft' => 'low',
            'balanced' => 'medium',
            'print' => 'high',
            default => 'medium',
        };

        if ($quality === 'auto') {
            $quality = null;
        }

        $size = $validated['size'] ?? null;

        try {
            $result = $openAiImageClient->generateDataUrl($fullPrompt, array_filter([
                'size' => $size,
                'quality' => $quality,
            ]));
        } catch (\Throwable $e) {
            if (config('ai_print_guard.retry_on_policy_error', true)
                && MerchandiseAiPromptGuardService::isLikelyPolicyOrModerationFailure($e->getMessage())) {
                try {
                    $retryPrompt = $merchandiseGuard->wrapRetryPrompt($validated['prompt'], $fidelity, $factoryId);
                    $result = $openAiImageClient->generateDataUrl($retryPrompt, array_filter([
                        'size' => $size,
                        'quality' => $quality,
                    ]));
                } catch (\Throwable $retryError) {
                    report($retryError);

                    return response()->json([
                        'message' => $retryError->getMessage() ?: 'Image generation failed.',
                    ], 502);
                }
            } else {
                report($e);

                return response()->json([
                    'message' => $e->getMessage() ?: 'Image generation failed.',
                ], 502);
            }
        }

        Generation::create([
            'project_id' => $project->id,
            'user_id' => $request->user()->id,
            'prompt' => $validated['prompt'],
            'provider' => 'openai_canvas',
            'status' => 'completed',
            'output_url' => null,
        ]);

        return response()->json([
            'data_url' => $result['data_url'],
            'revised_prompt' => $result['revised_prompt'],
        ]);
    }
}
