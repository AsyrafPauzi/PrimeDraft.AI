<?php

namespace App\Services;

/**
 * Server-side print readiness checks for scratch_layout (authoritative for gating).
 */
class PreflightService
{
    public const VERSION = 1;

    private const BLEED_SLACK = 0.06;

    /** @return array<string, mixed> */
    public function run(?array $scratchLayout, string $printProfile = 'dtf'): array
    {
        $profile = $this->normalizeProfile($printProfile);
        $issues = [];

        if (! is_array($scratchLayout) || $scratchLayout === []) {
            return $this->finalizeReport($profile, [
                [
                    'id' => 'empty_layout',
                    'severity' => 'warning',
                    'message' => 'No design data on file yet. Add artwork before production.',
                ],
            ]);
        }

        $sides = $scratchLayout['sides'] ?? null;
        if (! is_array($sides)) {
            $issues[] = [
                'id' => 'missing_sides',
                'severity' => 'error',
                'message' => 'Layout is missing printable sides.',
            ];

            return $this->finalizeReport($profile, $issues);
        }

        $colorSet = [];
        foreach ($sides as $sideName => $sideData) {
            if (! is_string($sideName) || ! is_array($sideData)) {
                continue;
            }
            $layers = $sideData['layers'] ?? null;
            if (! is_array($layers)) {
                continue;
            }
            foreach ($layers as $layer) {
                if (! is_array($layer) || ($layer['hidden'] ?? false) === true) {
                    continue;
                }
                $layerId = isset($layer['id']) ? (string) $layer['id'] : null;
                $type = isset($layer['type']) ? (string) $layer['type'] : '';

                $transform = is_array($layer['transform'] ?? null) ? $layer['transform'] : [];
                $x = (float) ($transform['x'] ?? 0);
                $y = (float) ($transform['y'] ?? 0);
                $w = (float) ($transform['w'] ?? 0.3);
                $h = (float) ($transform['h'] ?? 0.22);

                $this->checkBounds($issues, $sideName, $layerId, $x, $y, $w, $h);

                if ($type === 'text') {
                    $this->checkTextLayer($issues, $profile, $sideName, $layerId, $layer, $colorSet);
                } elseif ($type === 'image' || $type === 'graphicRef') {
                    $this->checkImageLayer($issues, $profile, $sideName, $layerId, $layer, $colorSet);
                }
            }
        }

        $distinctColors = count($colorSet);
        $maxColors = $profile['max_colors'];
        if ($maxColors > 0 && $distinctColors > $maxColors) {
            $issues[] = [
                'id' => 'color_count',
                'severity' => 'error',
                'message' => "Estimated {$distinctColors} ink colors exceed profile limit ({$maxColors}) for {$profile['label']}.",
                'meta' => ['distinct_colors' => $distinctColors, 'max' => $maxColors],
            ];
        } elseif ($maxColors > 0 && $distinctColors > max(1, (int) floor($maxColors * 0.85))) {
            $issues[] = [
                'id' => 'color_count_warn',
                'severity' => 'warning',
                'message' => "High color count ({$distinctColors}). Confirm separations for {$profile['label']}.",
                'meta' => ['distinct_colors' => $distinctColors],
            ];
        }

        return $this->finalizeReport($profile, $issues);
    }

    /**
     * @param  array<int, array<string, mixed>>  $issues
     * @return array<string, mixed>
     */
    private function finalizeReport(array $profile, array $issues): array
    {
        $hasError = false;
        $hasWarn = false;
        foreach ($issues as $issue) {
            $sev = $issue['severity'] ?? 'warning';
            if ($sev === 'error') {
                $hasError = true;
            }
            if ($sev === 'warning') {
                $hasWarn = true;
            }
        }

        $status = 'ok';
        if ($hasError) {
            $status = 'error';
        } elseif ($hasWarn) {
            $status = 'warn';
        }

        return [
            'status' => $status,
            'issues' => array_values($issues),
            'profile' => $profile['key'],
            'profile_label' => $profile['label'],
            'generated_at' => now()->toIso8601String(),
            'preflight_version' => self::VERSION,
        ];
    }

    /** @return array<string, mixed> */
    private function normalizeProfile(string $key): array
    {
        $k = strtolower(trim($key));
        $profiles = [
            'dtf' => ['key' => 'dtf', 'label' => 'DTF', 'min_text_px' => 10, 'min_layer_dim' => 0.02, 'max_colors' => 0],
            'screen' => ['key' => 'screen', 'label' => 'Screen print', 'min_text_px' => 12, 'min_layer_dim' => 0.03, 'max_colors' => 6],
            'sublimation' => ['key' => 'sublimation', 'label' => 'Sublimation', 'min_text_px' => 10, 'min_layer_dim' => 0.02, 'max_colors' => 0],
        ];

        return $profiles[$k] ?? $profiles['dtf'];
    }

    /**
     * @param  array<int, array<string, mixed>>  $issues
     */
    private function checkBounds(array &$issues, string $sideName, ?string $layerId, float $x, float $y, float $w, float $h): void
    {
        $max = 1 + self::BLEED_SLACK;
        $min = -self::BLEED_SLACK;
        if ($x < $min || $y < $min || $x + $w > $max || $y + $h > $max) {
            $issues[] = [
                'id' => 'bounds_bleed',
                'severity' => 'warning',
                'message' => 'Layer extends past the safe print area; trim or reposition for reliable registration.',
                'side' => $sideName,
                'layer_id' => $layerId,
            ];
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $issues
     * @param  array<string, mixed>  $profile
     * @param  array<string, mixed>  $layer
     * @param  array<string, true>  $colorSet
     */
    private function checkTextLayer(array &$issues, array $profile, string $sideName, ?string $layerId, array $layer, array &$colorSet): void
    {
        $props = is_array($layer['props'] ?? null) ? $layer['props'] : [];
        $fontSize = (int) ($props['fontSizePx'] ?? 16);
        if ($fontSize < $profile['min_text_px']) {
            $issues[] = [
                'id' => 'text_too_small',
                'severity' => 'warning',
                'message' => "Text is {$fontSize}px; {$profile['label']} recommends at least {$profile['min_text_px']}px for legible print.",
                'side' => $sideName,
                'layer_id' => $layerId,
            ];
        }

        $color = isset($props['color']) ? strtolower(trim((string) $props['color'])) : '';
        if ($color !== '' && preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/', $color)) {
            $colorSet[$color] = true;
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $issues
     * @param  array<string, mixed>  $profile
     * @param  array<string, mixed>  $layer
     * @param  array<string, true>  $colorSet
     */
    private function checkImageLayer(array &$issues, array $profile, string $sideName, ?string $layerId, array $layer, array &$colorSet): void
    {
        $transform = is_array($layer['transform'] ?? null) ? $layer['transform'] : [];
        $w = (float) ($transform['w'] ?? 0.3);
        $h = (float) ($transform['h'] ?? 0.22);
        $minDim = $profile['min_layer_dim'];
        if ($w < $minDim || $h < $minDim) {
            $issues[] = [
                'id' => 'image_tiny',
                'severity' => 'warning',
                'message' => 'Raster or graphic layer is very small on the garment; print detail may be lost.',
                'side' => $sideName,
                'layer_id' => $layerId,
            ];
        }

        $props = is_array($layer['props'] ?? null) ? $layer['props'] : [];
        $src = isset($props['src']) ? (string) $props['src'] : '';
        if (str_starts_with($src, 'data:image')) {
            $len = strlen($src);
            if ($len < 800) {
                $issues[] = [
                    'id' => 'image_low_entropy',
                    'severity' => 'warning',
                    'message' => 'Embedded image data looks very small; verify resolution for final print size.',
                    'side' => $sideName,
                    'layer_id' => $layerId,
                ];
            }
            $colorSet['image:'.substr(sha1($src), 0, 8)] = true;
        } else {
            $colorSet['image:generic'] = true;
        }
    }
}
