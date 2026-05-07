<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class PromptPolicyService
{
    public function assertValid(string $prompt): void
    {
        if (mb_strlen(trim($prompt)) === 0) {
            throw ValidationException::withMessages(['prompt' => 'Prompt is required.']);
        }

        if (mb_strlen($prompt) > 500) {
            throw ValidationException::withMessages(['prompt' => 'Prompt must not exceed 500 characters.']);
        }
    }
}
