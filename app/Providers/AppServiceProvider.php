<?php

namespace App\Providers;

use App\Services\AI\Providers\AiProviderInterface;
use App\Services\AI\Providers\MockAiProvider;
use App\Services\AI\Providers\OpenAiImageProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AiProviderInterface::class, function ($app) {
            if ($app->environment('testing') && filter_var(env('OPENAI_DISABLE_IN_TESTS', false), FILTER_VALIDATE_BOOLEAN)) {
                return new MockAiProvider;
            }

            $key = config('openai.api_key');
            if (is_string($key) && trim($key) !== '') {
                return $app->make(OpenAiImageProvider::class);
            }

            return new MockAiProvider;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
