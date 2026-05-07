<?php

namespace App\Jobs;

use App\Models\Generation;
use App\Services\AI\GenerationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessGenerationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $generationId)
    {
    }

    public function handle(GenerationService $generationService): void
    {
        $generation = Generation::find($this->generationId);

        if (! $generation) {
            return;
        }

        $result = $generationService->generate($generation->prompt);

        $generation->update([
            'status' => $result['status'] ?? 'completed',
            'output_url' => $result['output_url'] ?? null,
        ]);
    }
}
