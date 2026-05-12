<?php

namespace App\Services;

use App\Models\Factory;
use Illuminate\Validation\ValidationException;

/**
 * Core AI guard for merchandise image generation: safety, print rules, factory profile merge, prompt wrapping.
 */
class MerchandiseAiPromptGuardService
{
    public function assertContentPolicy(string $prompt): void
    {
        $normalized = mb_strtolower($prompt);
        foreach (config('ai_print_guard.blocked_prompt_substrings', []) as $bad) {
            if (! is_string($bad) || $bad === '') {
                continue;
            }
            if (mb_strpos($normalized, mb_strtolower($bad)) !== false) {
                throw ValidationException::withMessages([
                    'prompt' => 'This request cannot be used for merchandise generation. Remove restricted or unsafe content and try again.',
                ]);
            }
        }

        $forbiddenBrandPatterns = [
            '/\bexact\s+(?:replica|copy)\s+of\b/i',
            '/\b(?:nike|adidas|gucci|louis\s*vuitton|chanel|disney|marvel|dc\s*comics)\s+(?:logo|trademark|official)/i',
        ];
        foreach ($forbiddenBrandPatterns as $pattern) {
            if (@preg_match($pattern, $prompt) === 1) {
                throw ValidationException::withMessages([
                    'prompt' => 'Do not request replicas of protected brands or trademarks. Describe an original design instead.',
                ]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function resolvedFactoryProfile(?int $factoryId = null, ?array $merge = null): array
    {
        $base = config('ai_print_guard.default_factory_profile', []);
        if (! is_array($base)) {
            $base = [];
        }

        if ($factoryId !== null) {
            /** @var Factory|null $factory */
            $factory = Factory::query()->find($factoryId);
            $profile = $factory?->ai_print_profile;
            if (is_array($profile)) {
                $base = array_replace_recursive($base, $profile);
            }
        }

        if (is_array($merge)) {
            $base = array_replace_recursive($base, $merge);
        }

        return $base;
    }

    /**
     * Full prompt sent to OpenAI Images, enforcing print + safety rules (no silent reject — user prompt is validated first).
     */
    public function wrapForOpenAiImageGeneration(string $userPrompt, string $fidelity = 'balanced', ?int $factoryId = null): string
    {
        $profile = $this->resolvedFactoryProfile($factoryId);
        $profileJson = json_encode($profile, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $fidelityBlock = match ($fidelity) {
            'sketch' => 'Exploration sketch only: rough shapes, limited detail, still safe for later print refinement.',
            'draft' => 'Draft comp: simplified illustration, limited palette, clear hierarchy, not final micro-detail.',
            'print' => 'Final print intent: maximum clarity, bold separable shapes, production-ready edges.',
            default => 'Balanced: clear merchandise artwork, bold readable forms, print-conscious detail level.',
        };

        $coreRules = <<<'TXT'
You are an AI design generator for PHYSICAL merchandise printing (apparel, mugs, stickers, etc.).

STRICT OUTPUT RULES:
- Always produce print-ready, physically printable artwork.
- Never depict unsafe, illegal, hateful, or adult/NSFW content.
- Never reproduce copyrighted logos, trademarks, or character likenesses as official or exact copies.
- Use clean composition, strong visual hierarchy, centered balanced layout.
- Avoid microscopic detail, hairline strokes, and illegible tiny typography; any text must be large, bold, and readable at print size.
- Prefer bold, scalable shapes and high contrast suitable for DTF / screen print / sublimation.
- Default: TRANSPARENT background unless the user explicitly asks for a solid backdrop.
- Avoid heavy blur, noise, or low-quality artifacts; keep edges crisp for separation.
- Keep critical content inside a safe margin; do not bleed essential elements to the extreme edge unless requested.
TXT;

        $optimization = <<<'TXT'
PRINT-SAFE INTERPRETATION:
- Simplify overly complex ideas into bold, separable visual concepts.
- Prefer vector-like or clean illustration over unnecessary photorealism unless the user clearly requires photo style AND factory profile allows photorealism.
- Use a limited, high-contrast palette; avoid excessive color noise.
- If the user asks for text, render it thick and legible (merchandise scale), never as thin decorative micro-type.
TXT;

        $user = trim($userPrompt);
        $background = is_string($profile['background'] ?? null) ? $profile['background'] : 'transparent';
        $printType = is_string($profile['print_type'] ?? null) ? $profile['print_type'] : 'DTF';
        $minDpi = is_numeric($profile['min_dpi'] ?? null) ? (int) $profile['min_dpi'] : 300;

        return implode("\n\n", array_filter([
            $coreRules,
            'FACTORY PRINT PROFILE (must respect): '.$profileJson,
            $optimization,
            'FIDELITY MODE: '.$fidelityBlock,
            'USER REQUEST (interpret within ALL rules above — original artwork only):',
            '"'.$user.'"',
            'OUTPUT: Single square PNG-friendly composition, '.$background.' background by default, suitable for '.$printType.' with effective resolution mindset of at least '.$minDpi.' DPI when printed at typical garment widths.',
        ]));
    }

    /**
     * Shorter retry prompt when the API rejects the first attempt (best-effort; cannot inspect pixels server-side).
     */
    public function wrapRetryPrompt(string $userPrompt, string $fidelity = 'balanced', ?int $factoryId = null): string
    {
        $prefix = (string) config('ai_print_guard.retry_prompt_prefix', '');

        return $this->wrapForOpenAiImageGeneration($prefix.trim($userPrompt), $fidelity, $factoryId);
    }

    public static function isLikelyPolicyOrModerationFailure(string $message): bool
    {
        $m = mb_strtolower($message);

        return str_contains($m, 'safety')
            || str_contains($m, 'content_policy')
            || str_contains($m, 'moderation')
            || str_contains($m, 'blocked')
            || str_contains($m, 'policy')
            || str_contains($m, 'not allowed');
    }
}
