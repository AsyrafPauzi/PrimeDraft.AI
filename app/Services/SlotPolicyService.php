<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;

class SlotPolicyService
{
    public function maxProjectsFor(User $user): ?int
    {
        if ($user->role === 'freelancer') {
            return null;
        }

        return 3;
    }

    public function canCreateProject(User $user): bool
    {
        $limit = $this->maxProjectsFor($user);

        if ($limit === null) {
            return true;
        }

        return Project::where('user_id', $user->id)
            ->where('status', 'active')
            ->count() < $limit;
    }

    public function maxGenerationsFor(User $user): int
    {
        return $user->role === 'freelancer' ? 20 : 5;
    }
}
