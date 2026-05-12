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

class EditorFabricHighFidelityController extends Controller
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
            'preview_png' => ['required', 'string', 'max:18000000'],
            'fabric_json' => ['sometimes', 'nullable', 'array'],
            'fidelity' => ['nullable', 'string', 'in:sketch,draft,balanced,print'],
            'factory_id' => ['nullable', 'integer', 'exists:factories,id'],
        ]);

        $promptPolicyService->assertValid($validated['prompt']);

        $max = $slotPolicyService->maxGenerationsFor($request->user());
        $current = Generation::query()->where('project_id', $project->id)->count();
        if ($current >= $max) {
            return response()->json(['message' => 'Generation limit reached for this project.'], 422);
        }

        $fidelity = $validated['fidelity'] ?? 'print';
        $factoryId = isset($validated['factory_id']) ? (int) $validated['factory_id'] : null;
        $fullPrompt = $merchandiseGuard->wrapForOpenAiImageGeneration($validated['prompt'], $fidelity, $factoryId);

        $editModel = config('openai.image_edit_model');
        $useEdit = is_string($editModel) && trim($editModel) !== '';

        $result = null;
        $lastError = null;

        if ($useEdit) {
            try {
                OpenAiImageClient::decodeImageDataUrlToBinary($validated['preview_png']);
                $result = $openAiImageClient->editFromPngDataUrl($validated['preview_png'], $fullPrompt, array_filter([
                    'size' => (string) config('openai.default_size', '1024x1024'),
                ]));
            } catch (\Throwable $e) {
                $lastError = $e;
                report($e);
            }
        }

        if ($result === null) {
            try {
                $fallbackPrompt = $fullPrompt.' The user provided a separate low-fidelity PNG layout (not attached to this text-only request); infer a clean print-ready composition aligned with the instructions above.';
                $result = $openAiImageClient->generateDataUrl($fallbackPrompt, array_filter([
                    'size' => (string) config('openai.default_size', '1024x1024'),
                    'quality' => 'high',
                ]));
            } catch (\Throwable $e) {
                if (config('ai_print_guard.retry_on_policy_error', true)
                    && MerchandiseAiPromptGuardService::isLikelyPolicyOrModerationFailure($e->getMessage())) {
                    try {
                        $retryPrompt = $merchandiseGuard->wrapRetryPrompt($validated['prompt'], $fidelity, $factoryId);
                        $retryBody = $retryPrompt.' High-fidelity production print artwork for merchandise.';
                        $result = $openAiImageClient->generateDataUrl($retryBody, array_filter([
                            'size' => (string) config('openai.default_size', '1024x1024'),
                            'quality' => 'high',
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
        }

        if (! is_array($result) || empty($result['data_url'])) {
            return response()->json([
                'message' => $lastError?->getMessage() ?: 'Image generation failed.',
            ], 502);
        }

        Generation::create([
            'project_id' => $project->id,
            'user_id' => $request->user()->id,
            'prompt' => $validated['prompt'],
            'provider' => 'openai_fabric_hf',
            'status' => 'completed',
            'output_url' => null,
        ]);

        return response()->json([
            'data_url' => $result['data_url'],
            'revised_prompt' => $result['revised_prompt'] ?? null,
        ]);
    }
}
