<?php

namespace Tests\Unit;

use App\Services\MerchandiseAiPromptGuardService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class MerchandiseAiPromptGuardServiceTest extends TestCase
{
    public function test_wrap_includes_transparent_and_print_rules(): void
    {
        $guard = new MerchandiseAiPromptGuardService;
        $wrapped = $guard->wrapForOpenAiImageGeneration('A bold mountain icon', 'print', null);

        $this->assertStringContainsString('TRANSPARENT', $wrapped);
        $this->assertStringContainsString('A bold mountain icon', $wrapped);
        $this->assertStringContainsString('FACTORY PRINT PROFILE', $wrapped);
        $this->assertStringContainsString('DTF', $wrapped);
    }

    public function test_assert_content_policy_blocks_configured_substring(): void
    {
        $this->expectException(ValidationException::class);

        $guard = new MerchandiseAiPromptGuardService;
        $guard->assertContentPolicy('Something about child porn is bad');
    }

    public function test_assert_content_policy_blocks_exact_replica_brand_request(): void
    {
        $this->expectException(ValidationException::class);

        $guard = new MerchandiseAiPromptGuardService;
        $guard->assertContentPolicy('exact replica of nike logo for my shirt');
    }
}
