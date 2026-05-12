<?php

namespace App\Services\OpenAi;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAiImageClient
{
    private const API_URL = 'https://api.openai.com/v1/images/generations';

    private const API_EDITS_URL = 'https://api.openai.com/v1/images/edits';

    /**
     * @param  array{size?: string|null, quality?: string|null}  $options
     * @return array{data_url: string, revised_prompt: string|null}
     */
    public function generateDataUrl(string $prompt, array $options = []): array
    {
        $key = config('openai.api_key');
        if (! is_string($key) || trim($key) === '') {
            throw new RuntimeException('OpenAI is not configured (missing OPENAI_API_KEY).');
        }

        $model = (string) config('openai.image_model');
        $size = $options['size'] ?? (string) config('openai.default_size', '1024x1024');
        $quality = $options['quality'] ?? null;

        // Note: newer GPT Image models reject legacy `response_format`; rely on API default (b64_json or url in `data[]`).
        $payload = array_filter([
            'model' => $model,
            'prompt' => $prompt,
            'n' => 1,
            'size' => $size,
            'quality' => $quality,
        ], static fn ($v) => $v !== null && $v !== '');

        /** @var Response $response */
        $response = Http::withToken($key)
            ->acceptJson()
            ->timeout((int) config('openai.timeout_seconds', 120))
            ->post(self::API_URL, $payload);

        if (! $response->successful()) {
            $json = $response->json();
            $err = is_array($json) ? ($json['error'] ?? null) : null;
            $msg = is_array($err) ? (string) ($err['message'] ?? 'OpenAI request failed.') : (string) ($response->body() ?: 'OpenAI request failed.');
            throw new RuntimeException(mb_substr($msg, 0, 500));
        }

        $data = $response->json('data.0');
        if (! is_array($data)) {
            throw new RuntimeException('Unexpected OpenAI response shape.');
        }

        if (! empty($data['b64_json']) && is_string($data['b64_json'])) {
            return [
                'data_url' => 'data:image/png;base64,'.$data['b64_json'],
                'revised_prompt' => isset($data['revised_prompt']) && is_string($data['revised_prompt']) ? $data['revised_prompt'] : null,
            ];
        }

        if (! empty($data['url']) && is_string($data['url'])) {
            $binResponse = Http::timeout(60)->get($data['url']);
            if (! $binResponse->successful()) {
                throw new RuntimeException('Could not download generated image URL.');
            }

            return [
                'data_url' => 'data:image/png;base64,'.base64_encode($binResponse->body()),
                'revised_prompt' => isset($data['revised_prompt']) && is_string($data['revised_prompt']) ? $data['revised_prompt'] : null,
            ];
        }

        throw new RuntimeException('OpenAI did not return image data.');
    }

    /**
     * Image edits: multipart PNG + prompt. Requires a model that supports /v1/images/edits.
     *
     * @param  array{size?: string|null}  $options
     * @return array{data_url: string, revised_prompt: string|null}
     */
    public function editFromPngDataUrl(string $pngDataUrl, string $prompt, array $options = []): array
    {
        $key = config('openai.api_key');
        if (! is_string($key) || trim($key) === '') {
            throw new RuntimeException('OpenAI is not configured (missing OPENAI_API_KEY).');
        }

        $model = config('openai.image_edit_model');
        if (! is_string($model) || trim($model) === '') {
            throw new RuntimeException('Image edit model is not configured (set OPENAI_IMAGE_EDIT_MODEL).');
        }

        $binary = self::decodeImageDataUrlToBinary($pngDataUrl);
        $size = $options['size'] ?? (string) config('openai.default_size', '1024x1024');

        /** @var Response $response */
        $response = Http::withToken($key)
            ->acceptJson()
            ->timeout((int) config('openai.timeout_seconds', 120))
            ->attach('image', $binary, 'preview.png', ['Content-Type' => 'image/png'])
            ->post(self::API_EDITS_URL, [
                'model' => $model,
                'prompt' => $prompt,
                'n' => 1,
                'size' => $size,
            ]);

        if (! $response->successful()) {
            $json = $response->json();
            $err = is_array($json) ? ($json['error'] ?? null) : null;
            $msg = is_array($err) ? (string) ($err['message'] ?? 'OpenAI edit request failed.') : (string) ($response->body() ?: 'OpenAI edit request failed.');
            throw new RuntimeException(mb_substr($msg, 0, 500));
        }

        $data = $response->json('data.0');
        if (! is_array($data)) {
            throw new RuntimeException('Unexpected OpenAI edits response shape.');
        }

        if (! empty($data['b64_json']) && is_string($data['b64_json'])) {
            return [
                'data_url' => 'data:image/png;base64,'.$data['b64_json'],
                'revised_prompt' => isset($data['revised_prompt']) && is_string($data['revised_prompt']) ? $data['revised_prompt'] : null,
            ];
        }

        if (! empty($data['url']) && is_string($data['url'])) {
            $binResponse = Http::timeout(60)->get($data['url']);
            if (! $binResponse->successful()) {
                throw new RuntimeException('Could not download edited image URL.');
            }

            return [
                'data_url' => 'data:image/png;base64,'.base64_encode($binResponse->body()),
                'revised_prompt' => isset($data['revised_prompt']) && is_string($data['revised_prompt']) ? $data['revised_prompt'] : null,
            ];
        }

        throw new RuntimeException('OpenAI edits did not return image data.');
    }

    /**
     * @throws RuntimeException
     */
    public static function decodeImageDataUrlToBinary(string $dataUrl): string
    {
        $trim = trim($dataUrl);
        if (! preg_match('#^data:image/(png|jpeg|jpg|webp);base64,(.+)$#is', $trim, $m)) {
            throw new RuntimeException('Image must be a base64 data URL (png, jpeg, or webp).');
        }
        $raw = base64_decode($m[2], true);
        if ($raw === false || $raw === '') {
            throw new RuntimeException('Invalid base64 image payload.');
        }

        return $raw;
    }

    public static function augmentPromptForFidelity(string $userPrompt, string $fidelity): string
    {
        $base = trim($userPrompt);
        $suffix = match ($fidelity) {
            'sketch' => ' Visual style: rough low-fidelity thumbnail, pencil or marker sketch, grayscale or very limited palette, large simple shapes, visible construction lines, no photorealistic detail, no fine texture—design exploration quality only.',
            'draft' => ' Visual style: medium-fidelity flat illustration or vector-like comp, clean shapes, limited color count, readable at small size—layout and composition draft, not final print micro-detail.',
            'print' => ' Visual style: production-oriented artwork, clean edges, high contrast, print-friendly separations, avoid illegible micro-text.',
            'balanced' => ' Visual style: balanced illustration suitable for apparel print; avoid extreme micro-detail.',
            default => ' Visual style: balanced illustration suitable for apparel print; avoid extreme micro-detail.',
        };

        return $base.$suffix;
    }
}
