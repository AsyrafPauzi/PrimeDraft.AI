<?php

namespace Tests\Unit;

use App\Services\AI\GenerationService;
use App\Services\AI\Providers\AiProviderInterface;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GenerationServiceTest extends TestCase
{
    #[Test]
    public function it_generates_output_via_provider_adapter(): void
    {
        $provider = new class implements AiProviderInterface
        {
            public function generate(string $prompt): array
            {
                return [
                    'output_url' => 'generated/provider-output.png',
                    'status' => 'completed',
                ];
            }
        };

        $service = new GenerationService($provider);
        $result = $service->generate('PrimeDraft tiger shirt');

        $this->assertSame('completed', $result['status']);
        $this->assertSame('generated/provider-output.png', $result['output_url']);
    }
}
