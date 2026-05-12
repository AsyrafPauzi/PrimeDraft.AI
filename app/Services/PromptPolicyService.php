<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class PromptPolicyService
{
    public function __construct(private readonly MerchandiseAiPromptGuardService $merchandiseGuard) {}

    public function assertValid(string $prompt): void
    {
        if (mb_strlen(trim($prompt)) === 0) {
            throw ValidationException::withMessages(['prompt' => 'Prompt is required.']);
        }

        $max = (int) config('ai_print_guard.max_user_prompt_chars', 500);
        if (mb_strlen($prompt) > $max) {
            throw ValidationException::withMessages([
                'prompt' => 'Prompt must not exceed '.$max.' characters.',
            ]);
        }

        $this->merchandiseGuard->assertContentPolicy($prompt);
    }
}
