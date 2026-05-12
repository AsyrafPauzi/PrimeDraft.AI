<?php

namespace Tests\Unit;

use App\Services\ImagePipelineService;
use PHPUnit\Framework\TestCase;

class ImagePipelineServiceTest extends TestCase
{
    private function tinyPngDataUrl(): string
    {
        $b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

        return 'data:image/png;base64,'.$b64;
    }

    public function test_upscale_doubles_dimensions(): void
    {
        if (! function_exists('imagecreatefromstring')) {
            $this->markTestSkipped('GD extension not available.');
        }

        $svc = new ImagePipelineService;
        [$im] = $svc->decodeDataUrl($this->tinyPngDataUrl());
        $w = imagesx($im);
        $h = imagesy($im);
        $up = $svc->upscale($im, 2);
        imagedestroy($im);
        $this->assertSame($w * 2, imagesx($up));
        $this->assertSame($h * 2, imagesy($up));
        imagedestroy($up);
    }

    public function test_resize_for_print_300dpi_changes_width(): void
    {
        if (! function_exists('imagecreatefromstring')) {
            $this->markTestSkipped('GD extension not available.');
        }

        $svc = new ImagePipelineService;
        [$im] = $svc->decodeDataUrl($this->tinyPngDataUrl());
        $out = $svc->resizeForPrintDpi($im, 10, 300);
        imagedestroy($im);
        $this->assertSame(3000, imagesx($out));
        imagedestroy($out);
    }
}
