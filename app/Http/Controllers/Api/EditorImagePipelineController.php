<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ImagePipelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EditorImagePipelineController extends Controller
{
    public function upscale(Request $request, Project $project, ImagePipelineService $pipeline): JsonResponse
    {
        return $this->runStep($request, $project, $pipeline, function (\GdImage $im) use ($pipeline): \GdImage {
            return $pipeline->upscale($im, 2);
        });
    }

    public function removeBackground(Request $request, Project $project, ImagePipelineService $pipeline): JsonResponse
    {
        return $this->runStep($request, $project, $pipeline, function (\GdImage $im) use ($pipeline): \GdImage {
            return $pipeline->removeLightBackground($im);
        });
    }

    public function to300Dpi(Request $request, Project $project, ImagePipelineService $pipeline): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'image_base64' => ['required', 'string', 'max:26214400'],
            'target_width_inches' => ['nullable', 'numeric', 'min:0.5', 'max:54'],
            'dpi' => ['nullable', 'integer', 'min:72', 'max:600'],
        ]);

        $inches = (float) ($validated['target_width_inches'] ?? 10);
        $dpi = (int) ($validated['dpi'] ?? 300);

        $im = null;
        $out = null;
        try {
            [$im] = $pipeline->decodeDataUrl($validated['image_base64']);
            $out = $pipeline->resizeForPrintDpi($im, $inches, $dpi);
            $dataUrl = $pipeline->encodePngDataUrl($out);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Processing failed.'], 422);
        } finally {
            if ($out instanceof \GdImage) {
                imagedestroy($out);
            }
            if ($im instanceof \GdImage) {
                imagedestroy($im);
            }
        }

        return response()->json([
            'data_url' => $dataUrl,
            'dpi' => $dpi,
            'target_width_inches' => $inches,
            'note' => 'Pixel dimensions match requested print width at the chosen DPI. Embed in artwork for factory handoff.',
        ]);
    }

    public function vectorize(Request $request, Project $project, ImagePipelineService $pipeline): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'image_base64' => ['required', 'string', 'max:26214400'],
        ]);

        $im = null;
        try {
            [$im] = $pipeline->decodeDataUrl($validated['image_base64']);
            $svg = $pipeline->wrapRasterAsSvg($im);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Vectorization failed.'], 422);
        } finally {
            if ($im instanceof \GdImage) {
                imagedestroy($im);
            }
        }

        return response()->json([
            'svg' => $svg,
            'method' => 'embedded_raster',
            'note' => 'This SVG embeds the PNG for scaling-safe workflows. True curve tracing needs a dedicated tracing service.',
        ]);
    }

    /**
     * @param  callable(\GdImage): \GdImage  $fn
     */
    private function runStep(Request $request, Project $project, ImagePipelineService $pipeline, callable $fn): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'image_base64' => ['required', 'string', 'max:26214400'],
        ]);

        $im = null;
        $out = null;
        try {
            [$im] = $pipeline->decodeDataUrl($validated['image_base64']);
            $out = $fn($im);
            $dataUrl = $pipeline->encodePngDataUrl($out);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Processing failed.'], 422);
        } finally {
            if ($out instanceof \GdImage) {
                imagedestroy($out);
            }
            if ($im instanceof \GdImage) {
                imagedestroy($im);
            }
        }

        return response()->json(['data_url' => $dataUrl]);
    }
}
