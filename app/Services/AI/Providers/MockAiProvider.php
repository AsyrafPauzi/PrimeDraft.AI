<?php

namespace App\Services\AI\Providers;

class MockAiProvider implements AiProviderInterface
{
    public function generate(string $prompt): array
    {
        return [
            'status' => 'completed',
            'output_url' => 'generated/'.md5($prompt).'.png',
        ];
    }
}
