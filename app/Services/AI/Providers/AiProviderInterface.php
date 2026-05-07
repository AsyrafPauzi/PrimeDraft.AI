<?php

namespace App\Services\AI\Providers;

interface AiProviderInterface
{
    public function generate(string $prompt): array;
}
