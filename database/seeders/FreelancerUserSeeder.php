<?php

namespace Database\Seeders;

use App\Models\Generation;
use App\Models\Project;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FreelancerUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'freelancer@primedraft.test'],
            [
                'name' => 'Freelancer Demo User',
                'phone' => '+60122222222',
                'password' => Hash::make('password'),
                'role' => 'freelancer',
                'phone_verified' => true,
                'country_code' => 'MY',
                'email_verified_at' => now(),
            ]
        );

        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'status' => 'active',
                'expires_at' => now()->addMonth(),
                'grace_ends_at' => null,
            ]
        );

        $project = Project::updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Client Drop Streetwear'],
            [
                'country_code' => 'MY',
                'status' => 'active',
                'scratch_layout' => [
                    'templateId' => 'streetwear-drop',
                    'blocks' => [
                        ['type' => 'text', 'value' => 'DROP 24'],
                    ],
                ],
                'generated_output_url' => 'https://example.test/generated/freelancer-drop.png',
            ]
        );

        Generation::updateOrCreate(
            ['project_id' => $project->id, 'prompt' => 'Streetwear drop design with heavy typography'],
            [
                'user_id' => $user->id,
                'provider' => 'mock',
                'status' => 'done',
                'cost' => 1.50,
                'output_url' => 'https://example.test/generated/freelancer-drop.png',
            ]
        );
    }
}
