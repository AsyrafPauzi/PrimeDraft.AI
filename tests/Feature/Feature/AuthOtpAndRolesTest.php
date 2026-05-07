<?php

namespace Tests\Feature\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthOtpAndRolesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_phone_otp_and_role(): void
    {
        $requestOtp = $this->postJson('/api/auth/request-otp', [
            'phone' => '+601122334455',
        ]);

        $requestOtp->assertOk()
            ->assertJsonStructure(['otp_token', 'code']);

        $verify = $this->postJson('/api/auth/signup', [
            'otp_token' => $requestOtp->json('otp_token'),
            'code' => $requestOtp->json('code'),
            'name' => 'Asyraf',
            'email' => 'asyraf@example.test',
            'password' => 'secret123',
            'role' => 'normal',
        ]);

        $verify->assertCreated()
            ->assertJsonPath('user.role', 'normal')
            ->assertJsonPath('user.phone_verified', true)
            ->assertJsonStructure(['token']);
    }

    public function test_user_can_login_with_email_and_password(): void
    {
        User::factory()->create([
            'email' => 'asyraf@example.test',
            'password' => 'secret123',
            'phone_verified' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'asyraf@example.test',
            'password' => 'secret123',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_projects_endpoint_requires_authentication(): void
    {
        $this->postJson('/api/projects', [
            'name' => 'Unauthorized',
            'country_code' => 'MY',
        ])->assertUnauthorized();
    }

    public function test_factory_route_is_role_protected(): void
    {
        $normalUser = User::factory()->create([
            'role' => 'normal',
            'phone_verified' => true,
        ]);

        Sanctum::actingAs($normalUser);

        $this->getJson('/api/factory/orders')
            ->assertForbidden();

        $factoryUser = User::factory()->create([
            'role' => 'factory',
            'phone_verified' => true,
        ]);

        Sanctum::actingAs($factoryUser);

        $this->getJson('/api/factory/orders')->assertOk();
    }
}
