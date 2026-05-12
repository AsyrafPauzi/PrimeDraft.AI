<?php

namespace App\Services\AI\Providers;

use App\Services\MerchandiseAiPromptGuardService;
use App\Services\OpenAi\OpenAiImageClient;
use Illuminate\Support\Facades\Storage;

class OpenAiImageProvider implements AiProviderInterface
{
    public function __construct(
        private readonly OpenAiImageClient $client,
        private readonly MerchandiseAiPromptGuardService $merchandiseGuard,
    ) {}

    public function generate(string $prompt): array
    {
        $wrapped = $this->merchandiseGuard->wrapForOpenAiImageGeneration($prompt, 'print', null);
        $options = ['quality' => 'medium'];

        try {
            $result = $this->client->generateDataUrl($wrapped, $options);
        } catch (\Throwable $e) {
            if (config('ai_print_guard.retry_on_policy_error', true)
                && MerchandiseAiPromptGuardService::isLikelyPolicyOrModerationFailure($e->getMessage())) {
                $retry = $this->merchandiseGuard->wrapRetryPrompt($prompt, 'print', null);
                $result = $this->client->generateDataUrl($retry, $options);
            } else {
                throw $e;
            }
        }

        $raw = preg_replace('#^data:image/[^;]+;base64,#', '', $result['data_url']);
        $binary = base64_decode((string) $raw, true);
        if ($binary === false) {
            return ['status' => 'failed', 'output_url' => null];
        }

        $name = 'generations/'.uniqid('ai_', true).'.png';
        Storage::disk('public')->put($name, $binary);

        return [
            'status' => 'completed',
            'output_url' => Storage::url($name),
        ];
    }
}
