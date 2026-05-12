<?php

namespace Tests\Unit;

use App\Services\PreflightService;
use PHPUnit\Framework\TestCase;

class PreflightServiceTest extends TestCase
{
    public function test_empty_layout_returns_warning(): void
    {
        $svc = new PreflightService;
        $r = $svc->run(null, 'dtf');
        $this->assertSame('warn', $r['status']);
        $this->assertNotEmpty($r['issues']);
    }

    public function test_screen_profile_errors_when_color_count_exceeds_limit(): void
    {
        $colors = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777'];
        $layers = [];
        foreach ($colors as $i => $hex) {
            $layers[] = [
                'id' => 't'.$i,
                'type' => 'text',
                'zIndex' => $i + 1,
                'transform' => ['x' => 0.1 + $i * 0.01, 'y' => 0.1, 'w' => 0.2, 'h' => 0.1, 'rotation' => 0],
                'props' => ['text' => 'A', 'fontSizePx' => 24, 'color' => $hex],
            ];
        }

        $layout = [
            'version' => 1,
            'sides' => [
                'Front' => ['layers' => $layers],
            ],
        ];

        $svc = new PreflightService;
        $r = $svc->run($layout, 'screen');
        $this->assertSame('error', $r['status']);
        $ids = array_column($r['issues'], 'id');
        $this->assertContains('color_count', $ids);
    }

    public function test_dtf_allows_many_colors(): void
    {
        $layers = [];
        for ($i = 0; $i < 10; $i++) {
            $hex = sprintf('#%02x0000', min(255, 20 + $i * 20));
            $layers[] = [
                'id' => 't'.$i,
                'type' => 'text',
                'zIndex' => $i + 1,
                'transform' => ['x' => 0.1, 'y' => 0.05 + $i * 0.04, 'w' => 0.8, 'h' => 0.03, 'rotation' => 0],
                'props' => ['text' => 'X', 'fontSizePx' => 20, 'color' => $hex],
            ];
        }
        $layout = ['version' => 1, 'sides' => ['Front' => ['layers' => $layers]]];
        $svc = new PreflightService;
        $r = $svc->run($layout, 'dtf');
        $this->assertNotSame('error', $r['status']);
    }

    public function test_skips_hidden_layers(): void
    {
        $layout = [
            'version' => 1,
            'sides' => [
                'Front' => [
                    'layers' => [
                        [
                            'id' => 'hidden',
                            'type' => 'text',
                            'hidden' => true,
                            'zIndex' => 1,
                            'transform' => ['x' => 0, 'y' => 0, 'w' => 0.01, 'h' => 0.01, 'rotation' => 0],
                            'props' => ['text' => 'tiny', 'fontSizePx' => 4, 'color' => '#000'],
                        ],
                    ],
                ],
            ],
        ];
        $svc = new PreflightService;
        $r = $svc->run($layout, 'screen');
        $this->assertSame('ok', $r['status']);
    }
}
