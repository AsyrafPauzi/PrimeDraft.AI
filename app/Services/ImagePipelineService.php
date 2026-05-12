<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Server-side raster pipeline (GD): upscale, simple background removal, 300 DPI resize.
 * Vectorization returns an SVG that embeds the raster (true tracing is a separate service).
 */
class ImagePipelineService
{
    private const MAX_DECODE_BYTES = 18 * 1024 * 1024;

    private const MAX_DIMENSION = 6000;

    /**
     * @return array{0: \GdImage, 1: 'image/png'|'image/jpeg'}
     */
    public function decodeDataUrl(string $dataUrl): array
    {
        if (! preg_match('#^data:(image/(?:png|jpeg|jpg));base64,(.+)$#i', trim($dataUrl), $m)) {
            throw ValidationException::withMessages(['image_base64' => 'Expected a data URL (image/png or image/jpeg).']);
        }

        $mime = strtolower($m[1]) === 'image/jpg' ? 'image/jpeg' : $m[1];
        $raw = base64_decode($m[2], true);
        if ($raw === false) {
            throw ValidationException::withMessages(['image_base64' => 'Invalid base64 image data.']);
        }

        if (strlen($raw) > self::MAX_DECODE_BYTES) {
            throw ValidationException::withMessages(['image_base64' => 'Image is too large for the pipeline.']);
        }

        $im = @imagecreatefromstring($raw);
        if (! $im instanceof \GdImage) {
            throw ValidationException::withMessages(['image_base64' => 'Could not decode image.']);
        }

        imagesavealpha($im, true);

        return [$im, $mime];
    }

    public function encodePngDataUrl(\GdImage $im): string
    {
        ob_start();
        imagepng($im, null, 6);
        $bin = ob_get_clean();

        if ($bin === false || $bin === '') {
            throw new RuntimeException('Failed to encode PNG.');
        }

        return 'data:image/png;base64,'.base64_encode($bin);
    }

    /** @param  positive-int  $scale */
    public function upscale(\GdImage $src, int $scale = 2): \GdImage
    {
        $scale = max(2, min(4, $scale));
        $w = imagesx($src);
        $h = imagesy($src);
        $nw = min(self::MAX_DIMENSION, (int) ($w * $scale));
        $nh = min(self::MAX_DIMENSION, (int) ($h * $scale));
        if ($nw <= 0 || $nh <= 0) {
            throw new RuntimeException('Invalid image dimensions.');
        }

        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            throw new RuntimeException('Could not create target image.');
        }
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $nw, $nh, $transparent);
        imagealphablending($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        return $dst;
    }

    /**
     * Simple luminance threshold: bright pixels → transparent (works for light studio backgrounds).
     */
    public function removeLightBackground(\GdImage $src, int $threshold = 248): \GdImage
    {
        $w = imagesx($src);
        $h = imagesy($src);
        $dst = imagecreatetruecolor($w, $h);
        if ($dst === false) {
            throw new RuntimeException('Could not create image.');
        }
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $w, $h, $transparent);
        imagealphablending($dst, true);

        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($src, $x, $y);
                $r = ($c >> 16) & 0xFF;
                $g = ($c >> 8) & 0xFF;
                $b = $c & 0xFF;
                $a = ($c >> 24) & 0x7F;
                $lum = (int) (($r + $g + $b) / 3);
                if ($lum >= $threshold) {
                    imagesetpixel($dst, $x, $y, $transparent);
                } else {
                    $col = imagecolorallocatealpha($dst, $r, $g, $b, $a);
                    imagesetpixel($dst, $x, $y, $col);
                }
            }
        }

        return $dst;
    }

    /**
     * Resample so that print width at 300 DPI matches target inches (height scales).
     *
     * @param  positive-int  $dpi
     */
    public function resizeForPrintDpi(\GdImage $src, float $widthInches, int $dpi = 300): \GdImage
    {
        $widthInches = max(0.5, min(54.0, $widthInches));
        $dpi = max(72, min(600, $dpi));
        $w = imagesx($src);
        $h = imagesy($src);
        if ($w < 1 || $h < 1) {
            throw new RuntimeException('Invalid image dimensions.');
        }

        $nw = (int) round($widthInches * $dpi);
        $nw = min(self::MAX_DIMENSION, max(1, $nw));
        $nh = (int) max(1, round($h * ($nw / $w)));
        $nh = min(self::MAX_DIMENSION, $nh);

        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            throw new RuntimeException('Could not create target image.');
        }
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $nw, $nh, $transparent);
        imagealphablending($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

        return $dst;
    }

    /**
     * SVG wrapper around PNG (not true vector tracing).
     */
    public function wrapRasterAsSvg(\GdImage $im): string
    {
        $pngUrl = $this->encodePngDataUrl($im);
        $w = imagesx($im);
        $h = imagesy($im);
        $escaped = htmlspecialchars($pngUrl, ENT_QUOTES | ENT_XML1);

        return <<<SVG
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{$w}" height="{$h}" viewBox="0 0 {$w} {$h}">
  <image width="{$w}" height="{$h}" xlink:href="{$escaped}" />
</svg>
SVG;
    }
}
