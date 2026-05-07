<?php

namespace Database\Seeders;

use App\Models\Generation;
use App\Models\Payment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class NormalUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'normal@primedraft.test'],
            [
                'name' => 'Normal Demo User',
                'phone' => '+60111111111',
                'password' => Hash::make('password'),
                'role' => 'normal',
                'phone_verified' => true,
                'country_code' => 'MY',
                'email_verified_at' => now(),
            ]
        );

        $project = Project::updateOrCreate(
            ['user_id' => $user->id, 'name' => 'Normal Starter Tee'],
            [
                'country_code' => 'MY',
                'status' => 'active',
                'scratch_layout' => [
                    'templateId' => 'sports-jersey-basic',
                    'blocks' => [
                        ['type' => 'text', 'value' => 'TEAM PRIME'],
                    ],
                ],
                'generated_output_url' => null,
            ]
        );

        Generation::updateOrCreate(
            ['project_id' => $project->id, 'prompt' => 'Minimal jersey with bold center text'],
            [
                'user_id' => $user->id,
                'provider' => 'mock',
                'status' => 'queued',
                'cost' => 0,
            ]
        );

        Payment::updateOrCreate(
            ['project_id' => $project->id, 'purpose' => 'download'],
            [
                'user_id' => $user->id,
                'channel' => 'billplz',
                'amount' => 19.00,
                'status' => 'pending',
            ]
        );
    }
}
