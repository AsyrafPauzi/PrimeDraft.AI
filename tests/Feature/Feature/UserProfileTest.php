<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_patch_profile_fields(): void
    {
        $user = User::factory()->create([
            'role' => 'normal',
            'country_code' => 'MY',
        ]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/me', [
            'name' => 'Updated Name',
            'company_name' => 'ACME Studio',
            'billing_line1' => '12 Jalan Example',
            'billing_city' => 'Kuala Lumpur',
            'billing_postcode' => '50450',
            'receiver_line1' => '99 Receiver Road',
            'receiver_city' => 'Petaling Jaya',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.company_name', 'ACME Studio')
            ->assertJsonPath('user.billing_line1', '12 Jalan Example')
            ->assertJsonPath('user.receiver_line1', '99 Receiver Road');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'company_name' => 'ACME Studio',
        ]);
    }
}
