<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_all_user_roles(): void
    {
        $this->seed(DatabaseSeeder::class);

        $roles = User::query()->pluck('role')->all();

        $this->assertContains('normal', $roles);
        $this->assertContains('freelancer', $roles);
        $this->assertContains('factory', $roles);
    }
}
