<?php

namespace App\Services;

class PrintValidationService
{
    public function validate(int $dpi, int $colorCount): array
    {
        $errors = [];

        if ($dpi < 360) {
            $errors[] = 'DPI must be at least 360.';
        }

        if ($colorCount > 8) {
            $errors[] = 'Color count exceeds factory-supported limit.';
        }

        return [
            'valid' => count($errors) === 0,
            'errors' => $errors,
        ];
    }
}
