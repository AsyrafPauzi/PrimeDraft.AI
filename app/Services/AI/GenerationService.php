<?php

namespace App\Services\AI;

use App\Services\AI\Providers\AiProviderInterface;

class GenerationService
{
    public function __construct(private readonly AiProviderInterface $provider)
    {
    }

    public function generate(string $prompt): array
    {
        return $this->provider->generate($prompt);
    }
}
