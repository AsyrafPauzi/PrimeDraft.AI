<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Factory;
use App\Models\Order;
use App\Models\Project;
use App\Services\FactoryMatchingService;
use App\Support\ApparelSizes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FactoryController extends Controller
{
    public function __construct(
        private readonly FactoryMatchingService $factoryMatchingService
    ) {}

    public function orders(Request $request): JsonResponse
    {
        $factory = Factory::query()->where('user_id', $request->user()->id)->first();

        if (! $factory) {
            return response()->json(['orders' => []]);
        }

        return response()->json([
            'orders' => Order::query()
                ->where('factory_id', $factory->id)
                ->whereIn('shipping_status', ['pending_production', 'in_production', 'shipped', 'delivered'])
                ->with(['project:id,name,country_code', 'lineItems'])
                ->latest()
                ->get()
                ->map(fn (Order $order): array => [
                    'id' => $order->id,
                    'project_id' => $order->project_id,
                    'project_name' => $order->project?->name,
                    'production_price' => (float) $order->production_price,
                    'shipping_status' => $order->shipping_status,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'lines' => $order->lineItems->map(fn ($line): array => [
                        'size_code' => $line->size_code,
                        'qty' => (int) $line->qty,
                        'unit_price' => (float) $line->unit_price,
                    ])->values()->all(),
                ]),
        ]);
    }

    public function pricingIndex(Request $request): JsonResponse
    {
        $factory = Factory::query()
            ->where('user_id', $request->user()->id)
            ->with('sizePrices')
            ->first();

        if (! $factory) {
            return response()->json([
                'message' => 'No factory workspace linked to this account.',
                'factory' => null,
                'sizes' => [],
                'canonical_size_codes' => ApparelSizes::canonicalCodes(),
            ], 422);
        }

        $sizes = [];
        foreach ($factory->sizePrices as $row) {
            $sizes[] = ['code' => $row->size_code, 'price' => (float) $row->price];
        }

        return response()->json([
            'factory' => ['id' => $factory->id, 'name' => $factory->name, 'country_code' => $factory->country_code],
            'sizes' => $sizes,
            'canonical_size_codes' => ApparelSizes::canonicalCodes(),
        ]);
    }

    public function pricingUpdate(Request $request): JsonResponse
    {
        $factory = Factory::query()->where('user_id', $request->user()->id)->first();
        abort_if(! $factory, 404, 'Factory not linked to this account.');

        $validated = $request->validate([
            'sizes' => ['required', 'array', 'min:0'],
            'sizes.*.size_code' => ['required', 'string', 'max:16'],
            'sizes.*.price' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($factory, $validated): void {
            $factory->sizePrices()->delete();
            foreach ($validated['sizes'] as $row) {
                $price = (float) $row['price'];
                if ($price <= 0) {
                    continue;
                }
                $factory->sizePrices()->create([
                    'size_code' => strtoupper(trim($row['size_code'])),
                    'price' => $price,
                ]);
            }
        });

        return $this->pricingIndex($request);
    }

    public function matching(Request $request): JsonResponse
    {
        $countryCode = strtoupper((string) $request->user()->country_code);

        $projectId = $request->query('project_id');
        if ($projectId !== null && $projectId !== '') {
            /** @var Project|null $project */
            $project = Project::query()->find((int) $projectId);
            abort_if(! $project || $project->user_id !== $request->user()->id, 403);
            $countryCode = strtoupper($project->country_code);
        }

        Factory::firstOrCreate(
            ['name' => "Default {$countryCode} Factory"],
            ['country_code' => $countryCode, 'base_price' => 25, 'active' => true]
        );

        return response()->json([
            'country_code' => $countryCode,
            'factories' => $this->factoryMatchingService->matchingFactoriesFor($request->user(), $countryCode),
        ]);
    }

    /**
     * Lightweight directory for marketplace / RFQ flows (active factories in a region).
     */
    public function directory(Request $request): JsonResponse
    {
        $raw = $request->query('country_code');
        $cc = is_string($raw) && strlen(trim($raw)) >= 2
            ? strtoupper(substr(trim($raw), 0, 2))
            : strtoupper((string) $request->user()->country_code);

        $factories = Factory::query()
            ->where('active', true)
            ->whereRaw('upper(country_code) = ?', [$cc])
            ->orderBy('name')
            ->get(['id', 'name', 'country_code', 'base_price'])
            ->map(fn (Factory $f): array => [
                'id' => $f->id,
                'name' => $f->name,
                'country_code' => $f->country_code,
                'base_price' => (float) $f->base_price,
            ])
            ->values();

        return response()->json([
            'country_code' => $cc,
            'factories' => $factories,
        ]);
    }
}
