<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Factory;
use App\Models\FactorySizePrice;
use App\Models\Order;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectDraftOrderController extends Controller
{
    public function store(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'factory_id' => ['required', 'integer'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.size_code' => ['required', 'string', 'max:16'],
            'lines.*.qty' => ['required', 'integer', 'min:1'],
        ]);

        $factoryId = (int) $validated['factory_id'];

        /** @var Factory|null $factory */
        $factory = Factory::query()
            ->where('id', $factoryId)
            ->where('active', true)
            ->whereRaw('upper(country_code) = upper(?)', [$project->country_code])
            ->first();

        if (! $factory) {
            return response()->json([
                'message' => 'Factory is unavailable for this project region.',
            ], 422);
        }

        $priceByUpper = FactorySizePrice::query()
            ->where('factory_id', $factory->id)
            ->where('price', '>', 0)
            ->get()
            ->keyBy(fn (FactorySizePrice $row): string => strtoupper((string) $row->size_code));

        $linePayload = [];
        $productionTotal = 0.0;

        foreach ($validated['lines'] as $line) {
            $upper = strtoupper(trim($line['size_code']));
            $qty = (int) $line['qty'];
            if ($qty < 1) {
                continue;
            }
            if (! isset($priceByUpper[$upper])) {
                return response()->json([
                    'message' => "Size {$line['size_code']} is not available from this factory.",
                ], 422);
            }

            $unit = (float) $priceByUpper[$upper]->price;
            $lineTotal = $qty * $unit;
            $productionTotal += $lineTotal;
            $linePayload[] = [
                'size_code' => $priceByUpper[$upper]->size_code,
                'qty' => $qty,
                'unit_price' => $unit,
            ];
        }

        if ($linePayload === []) {
            return response()->json([
                'message' => 'Add at least one size with quantity before submitting.',
            ], 422);
        }

        $order = DB::transaction(function () use ($project, $factory, $linePayload, $productionTotal): Order {
            $created = Order::create([
                'project_id' => $project->id,
                'factory_id' => $factory->id,
                'production_price' => round($productionTotal, 2),
                'platform_margin' => 0,
                'shipping_status' => 'draft',
            ]);

            foreach ($linePayload as $row) {
                $created->lineItems()->create($row);
            }

            return $created->fresh(['lineItems']);
        });

        return response()->json([
            'order' => [
                'id' => $order->id,
                'project_id' => $order->project_id,
                'factory_id' => $order->factory_id,
                'production_price' => (float) $order->production_price,
                'shipping_status' => $order->shipping_status,
                'lines' => $order->lineItems->map(fn ($li): array => [
                    'size_code' => $li->size_code,
                    'qty' => $li->qty,
                    'unit_price' => (float) $li->unit_price,
                ]),
            ],
        ], 201);
    }
}
