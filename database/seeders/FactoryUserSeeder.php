<?php

namespace Database\Seeders;

use App\Models\Factory;
use App\Models\FactorySizePrice;
use App\Models\Order;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FactoryUserSeeder extends Seeder
{
    public function run(): void
    {
        $factoryUser = User::updateOrCreate(
            ['email' => 'factory@primedraft.test'],
            [
                'name' => 'Factory Demo User',
                'phone' => '+60133333333',
                'password' => Hash::make('password'),
                'role' => 'factory',
                'phone_verified' => true,
                'country_code' => 'MY',
                'email_verified_at' => now(),
            ]
        );

        $normalUser = User::updateOrCreate(
            ['email' => 'orders.customer@primedraft.test'],
            [
                'name' => 'Orders Customer',
                'phone' => '+60144444444',
                'password' => Hash::make('password'),
                'role' => 'normal',
                'phone_verified' => true,
                'country_code' => 'MY',
                'email_verified_at' => now(),
            ]
        );

        $project = Project::updateOrCreate(
            ['user_id' => $normalUser->id, 'name' => 'Factory Queue Hoodie'],
            [
                'country_code' => 'MY',
                'status' => 'active',
            ]
        );

        $factory = Factory::updateOrCreate(
            ['name' => 'MY Demo Factory'],
            [
                'user_id' => $factoryUser->id,
                'country_code' => 'MY',
                'base_price' => 25.00,
                'active' => true,
            ]
        );

        foreach (
            [
                'XS' => 19.0,
                'S' => 21.0,
                'M' => 23.0,
                'L' => 25.0,
                'XL' => 27.0,
                '2XL' => 30.0,
            ] as $code => $amount
        ) {
            FactorySizePrice::updateOrCreate(
                [
                    'factory_id' => $factory->id,
                    'size_code' => $code,
                ],
                ['price' => $amount]
            );
        }

        Order::updateOrCreate(
            ['project_id' => $project->id, 'factory_id' => $factory->id],
            [
                'production_price' => 42.00,
                'platform_margin' => 8.00,
                'shipping_status' => 'pending',
            ]
        );

        // Keep role account active in seed data usage flow.
        $factoryUser->touch();
    }
}
