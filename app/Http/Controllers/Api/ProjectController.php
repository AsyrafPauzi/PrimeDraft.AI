<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\SlotPolicyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request, SlotPolicyService $slotPolicyService): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:all,active,completed,archived'],
            'sort_by' => ['nullable', 'in:name,status,country_code,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $query = Project::query()->where('user_id', $user->id);

        $search = trim((string) ($validated['search'] ?? ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', '%'.$search.'%')
                    ->orWhere('country_code', 'like', '%'.strtoupper($search).'%');
            });
        }

        $statusFilter = $validated['status'] ?? 'all';
        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDir = $validated['sort_dir'] ?? 'desc';

        $projects = $query
            ->orderBy($sortBy, $sortDir)
            ->paginate((int) ($validated['per_page'] ?? 10));

        $limit = $slotPolicyService->maxProjectsFor($user);
        $activeCount = Project::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->count();

        return response()->json([
            'projects' => $projects->items(),
            'pagination' => [
                'current_page' => $projects->currentPage(),
                'per_page' => $projects->perPage(),
                'last_page' => $projects->lastPage(),
                'total' => $projects->total(),
            ],
            'slots' => [
                'limit' => $limit,
                'active' => $activeCount,
                'remaining' => $limit === null ? null : max(0, $limit - $activeCount),
            ],
        ]);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        return response()->json(['project' => $project]);
    }

    public function store(Request $request, SlotPolicyService $slotPolicyService): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country_code' => ['required', 'string', 'size:2'],
            'merchandise' => ['nullable', 'string', 'max:120'],
            'material' => ['nullable', 'string', 'max:120'],
            'client_reference' => ['nullable', 'string', 'max:160'],
            'internal_notes' => ['nullable', 'string', 'max:5000'],
            'target_delivery_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'string', 'in:low,normal,high'],
            'estimated_quantity' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ]);

        if (! $slotPolicyService->canCreateProject($request->user())) {
            return response()->json(['message' => 'Project slot limit reached.'], 422);
        }

        $merchandiseRaw = trim((string) (($validated['merchandise'] ?? null) ?: ($validated['material'] ?? '')));
        $merchandise = $merchandiseRaw !== '' ? mb_substr($merchandiseRaw, 0, 120) : null;

        $scratchLayoutPieces = ['version' => 1];

        if ($merchandise !== null) {
            $scratchLayoutPieces['merchandise'] = $merchandise;
        }

        if (! empty($validated['client_reference'])) {
            $scratchLayoutPieces['client_reference'] = $validated['client_reference'];
        }
        if (! empty($validated['internal_notes'])) {
            $scratchLayoutPieces['internal_notes'] = $validated['internal_notes'];
        }
        if (! empty($validated['target_delivery_date'])) {
            $scratchLayoutPieces['target_delivery_date'] = $validated['target_delivery_date'];
        }
        if (! empty($validated['priority'])) {
            $scratchLayoutPieces['priority'] = $validated['priority'];
        }
        if (($validated['estimated_quantity'] ?? null) !== null && (int) $validated['estimated_quantity'] >= 1) {
            $scratchLayoutPieces['estimated_quantity'] = (int) $validated['estimated_quantity'];
        }

        $scratchLayout = count($scratchLayoutPieces) > 1 || isset($scratchLayoutPieces['merchandise'])
            ? $scratchLayoutPieces
            : null;

        $project = Project::create([
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'country_code' => strtoupper($validated['country_code']),
            'status' => 'active',
            'scratch_layout' => $scratchLayout,
        ]);

        return response()->json(['project' => $project], 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:active,completed,archived'],
        ]);

        $project->update($validated);

        return response()->json(['project' => $project->fresh()]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        abort_if($project->user_id !== $request->user()->id, 403);

        $project->delete();

        return response()->json(['ok' => true]);
    }

    public function bulkAction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'in:archive,delete'],
            'project_ids' => ['required', 'array', 'min:1'],
            'project_ids.*' => ['integer'],
        ]);

        $projects = Project::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $validated['project_ids'])
            ->get();

        if ($projects->isEmpty()) {
            return response()->json(['message' => 'No matching projects found.'], 404);
        }

        if ($validated['action'] === 'archive') {
            Project::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('id', $projects->pluck('id'))
                ->update(['status' => 'archived']);
        } else {
            Project::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('id', $projects->pluck('id'))
                ->delete();
        }

        return response()->json([
            'ok' => true,
            'affected' => $projects->count(),
            'action' => $validated['action'],
        ]);
    }
}
