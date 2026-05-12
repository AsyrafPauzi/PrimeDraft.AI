<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Factory;
use App\Models\Order;
use App\Models\Project;
use App\Models\Rfq;
use App\Models\RfqBid;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RfqController extends Controller
{
    public function indexMine(Request $request): JsonResponse
    {
        $user = $request->user();

        $rfqs = Rfq::query()
            ->where('user_id', $user->id)
            ->with(['project:id,name,country_code', 'bids.factory:id,name,country_code'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (Rfq $r): array => $this->serializeRfq($r));

        return response()->json(['rfqs' => $rfqs]);
    }

    public function factoryInbox(Request $request): JsonResponse
    {
        $factory = Factory::query()->where('user_id', $request->user()->id)->first();
        if (! $factory) {
            return response()->json(['rfqs' => []]);
        }

        $country = strtoupper((string) $factory->country_code);

        $rfqs = Rfq::query()
            ->where('status', 'open')
            ->whereHas('project', fn ($q) => $q->whereRaw('upper(country_code) = ?', [$country]))
            ->with(['project:id,name,country_code', 'buyer:id,name', 'bids'])
            ->latest()
            ->limit(100)
            ->get()
            ->map(function (Rfq $r) use ($factory): array {
                $base = $this->serializeRfq($r, false);
                $myBid = $r->bids->firstWhere('factory_id', $factory->id);

                return array_merge($base, [
                    'my_bid' => $myBid ? [
                        'id' => $myBid->id,
                        'total_price' => (float) $myBid->total_price,
                        'status' => $myBid->status,
                    ] : null,
                ]);
            });

        return response()->json(['rfqs' => $rfqs]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'order_id' => ['nullable', 'integer'],
            'quantity_summary' => ['nullable', 'array'],
        ]);

        if (isset($validated['order_id'])) {
            /** @var Order|null $order */
            $order = Order::query()->find((int) $validated['order_id']);
            abort_if(! $order || $order->project_id !== $project->id, 422, 'Invalid order for this project.');
            abort_if($order->project?->user_id !== $request->user()->id, 403);
        }

        $rfq = Rfq::create([
            'user_id' => $request->user()->id,
            'project_id' => $project->id,
            'order_id' => $validated['order_id'] ?? null,
            'title' => $validated['title'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'open',
            'quantity_summary' => $validated['quantity_summary'] ?? null,
        ]);

        $rfq->load(['project:id,name,country_code', 'bids']);

        return response()->json(['rfq' => $this->serializeRfq($rfq)], 201);
    }

    public function show(Request $request, Rfq $rfq): JsonResponse
    {
        $user = $request->user();
        $factory = Factory::query()->where('user_id', $user->id)->first();

        $isBuyer = $rfq->user_id === $user->id;
        $isFactoryParticipant = $factory && $rfq->bids()->where('factory_id', $factory->id)->exists();

        abort_if(! $isBuyer && ! $isFactoryParticipant, 403);

        if ($isBuyer) {
            $rfq->load(['project:id,name,country_code', 'bids.factory:id,name,country_code']);
        } elseif ($factory) {
            $rfq->load(['project:id,name,country_code', 'bids' => fn ($q) => $q->where('factory_id', $factory->id), 'bids.factory:id,name,country_code']);
        }

        return response()->json(['rfq' => $this->serializeRfq($rfq)]);
    }

    public function storeBid(Request $request, Rfq $rfq): JsonResponse
    {
        abort_if($rfq->status !== 'open', 422, 'This RFQ is no longer accepting bids.');

        $factory = Factory::query()->where('user_id', $request->user()->id)->first();
        abort_if(! $factory, 403, 'Factory workspace required to submit a bid.');

        $project = $rfq->project;
        abort_if(! $project, 404);
        abort_if(strtoupper((string) $factory->country_code) !== strtoupper((string) $project->country_code), 422, 'Factory region does not match this project.');

        $validated = $request->validate([
            'total_price' => ['required', 'numeric', 'min:0.01'],
            'lead_time_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $bid = RfqBid::query()->updateOrCreate(
            [
                'rfq_id' => $rfq->id,
                'factory_id' => $factory->id,
            ],
            [
                'total_price' => round((float) $validated['total_price'], 2),
                'lead_time_days' => $validated['lead_time_days'] ?? null,
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
            ]
        );

        $bid->load('factory:id,name,country_code');

        return response()->json([
            'bid' => [
                'id' => $bid->id,
                'factory_id' => $bid->factory_id,
                'factory_name' => $bid->factory?->name,
                'total_price' => (float) $bid->total_price,
                'lead_time_days' => $bid->lead_time_days,
                'status' => $bid->status,
            ],
        ], 201);
    }

    public function accept(Request $request, Rfq $rfq): JsonResponse
    {
        abort_if($rfq->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'bid_id' => ['required', 'integer'],
        ]);

        /** @var RfqBid|null $bid */
        $bid = RfqBid::query()
            ->where('id', (int) $validated['bid_id'])
            ->where('rfq_id', $rfq->id)
            ->first();

        abort_if(! $bid, 404, 'Bid not found on this RFQ.');
        abort_if($rfq->status !== 'open', 422, 'RFQ is already closed.');

        DB::transaction(function () use ($rfq, $bid): void {
            $bid->update(['status' => 'accepted']);
            RfqBid::query()
                ->where('rfq_id', $rfq->id)
                ->where('id', '!=', $bid->id)
                ->update(['status' => 'declined']);

            $rfq->update([
                'status' => 'awarded',
                'awarded_bid_id' => $bid->id,
            ]);

            if ($rfq->order_id) {
                Order::query()->where('id', $rfq->order_id)->where('shipping_status', 'draft')->update([
                    'factory_id' => $bid->factory_id,
                ]);
            } else {
                /** @var Order|null $draft */
                $draft = Order::query()
                    ->where('project_id', $rfq->project_id)
                    ->where('shipping_status', 'draft')
                    ->latest('id')
                    ->first();
                if ($draft) {
                    $draft->update(['factory_id' => $bid->factory_id]);
                }
            }
        });

        $rfq->refresh()->load(['bids.factory:id,name,country_code']);

        return response()->json([
            'rfq' => $this->serializeRfq($rfq),
            'message' => 'Bid accepted. Review draft order pricing before paying for production.',
        ]);
    }

    private function serializeRfq(Rfq $r, bool $withBids = true): array
    {
        $data = [
            'id' => $r->id,
            'status' => $r->status,
            'title' => $r->title,
            'notes' => $r->notes,
            'project_id' => $r->project_id,
            'order_id' => $r->order_id,
            'quantity_summary' => $r->quantity_summary,
            'awarded_bid_id' => $r->awarded_bid_id,
            'created_at' => $r->created_at?->toIso8601String(),
            'project' => $r->relationLoaded('project') && $r->project
                ? ['id' => $r->project->id, 'name' => $r->project->name, 'country_code' => $r->project->country_code]
                : null,
        ];

        if ($withBids && $r->relationLoaded('bids')) {
            $data['bids'] = $r->bids->map(fn (RfqBid $b): array => [
                'id' => $b->id,
                'factory_id' => $b->factory_id,
                'factory_name' => $b->factory?->name,
                'total_price' => (float) $b->total_price,
                'lead_time_days' => $b->lead_time_days,
                'message' => $b->message,
                'status' => $b->status,
            ])->values()->all();
        }

        return $data;
    }
}
