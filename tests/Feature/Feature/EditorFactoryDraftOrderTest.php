<?php

namespace Tests\Feature\Feature;

use App\Models\Factory;
use App\Models\FactorySizePrice;
use App\Models\Order;
use App\Models\OrderLineItem;
use App\Models\Payment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditorFactoryDraftOrderTest extends TestCase
{
    use RefreshDatabase;

    private function seedFactory(User $factoryUser): Factory
    {
        /** @var Factory $factory */
        $factory = Factory::query()->create([
            'user_id' => $factoryUser->id,
            'name' => 'Test GarmentWorks',
            'country_code' => 'MY',
            'base_price' => 40,
            'active' => true,
        ]);

        FactorySizePrice::query()->create(['factory_id' => $factory->id, 'size_code' => 'XS', 'price' => 10]);
        FactorySizePrice::query()->create(['factory_id' => $factory->id, 'size_code' => 'L', 'price' => 14]);
        FactorySizePrice::query()->create(['factory_id' => $factory->id, 'size_code' => 'XL', 'price' => 18]);

        return $factory;
    }

    public function test_matching_includes_sorted_priced_sizes_only(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);

        $this->seedFactory($factoryUser);

        Sanctum::actingAs($normal);

        $this->getJson('/api/factories/matching')
            ->assertOk()
            ->assertJsonPath('factories.0.sizes.0.code', 'XS')
            ->assertJsonPath('factories.0.sizes.0.price', 10)
            ->assertJsonStructure(['factories' => [['id', 'name', 'country_code', 'base_price', 'sizes']]]);
    }

    public function test_matching_uses_project_country_when_project_id_is_sent(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $this->seedFactory($factoryUser);

        $projectMy = Project::query()->create([
            'user_id' => $normal->id,
            'name' => 'MY Editorial',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($normal);

        $this->getJson("/api/factories/matching?project_id={$projectMy->id}")
            ->assertOk()
            ->assertJsonPath('country_code', 'MY');
    }

    public function test_draft_order_rejects_country_mismatch(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $factory = $this->seedFactory($factoryUser);

        $project = Project::query()->create([
            'user_id' => $normal->id,
            'name' => 'SG Editorial',
            'country_code' => 'SG',
        ]);

        Factory::query()->create([
            'user_id' => $factoryUser->id,
            'name' => 'SG Works',
            'country_code' => 'SG',
            'base_price' => 44,
            'active' => true,
        ]);

        Sanctum::actingAs($normal);

        $this->postJson("/api/projects/{$project->id}/orders/draft", [
            'factory_id' => $factory->id,
            'lines' => [
                ['size_code' => 'XS', 'qty' => 2],
            ],
        ])->assertStatus(422);
    }

    public function test_draft_order_rejects_unpriced_size(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $factory = $this->seedFactory($factoryUser);
        $project = Project::query()->create([
            'user_id' => $normal->id,
            'name' => 'Draft Test',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($normal);

        $this->postJson("/api/projects/{$project->id}/orders/draft", [
            'factory_id' => $factory->id,
            'lines' => [
                ['size_code' => 'M', 'qty' => 1],
            ],
        ])->assertStatus(422);
    }

    public function test_draft_order_creates_lines_and_totals(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $factory = $this->seedFactory($factoryUser);

        $project = Project::query()->create([
            'user_id' => $normal->id,
            'name' => 'Draft Happy',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($normal);

        $response = $this->postJson("/api/projects/{$project->id}/orders/draft", [
            'factory_id' => $factory->id,
            'lines' => [
                ['size_code' => 'XS', 'qty' => 2],
                ['size_code' => 'XL', 'qty' => 1],
            ],
        ]);

        $response->assertCreated();
        $this->assertEquals(38.0, (float) $response->json('order.production_price'));

        $orderId = $response->json('order.id');
        $this->assertEquals(38.0, round((float) Order::query()->find($orderId)?->production_price, 2));
        $this->assertSame(2, OrderLineItem::query()->where('order_id', $orderId)->count());

        /** @var OrderLineItem|null $xl */
        $xl = OrderLineItem::query()->where('order_id', $orderId)->where('size_code', 'XL')->first();
        $this->assertNotNull($xl);
        $this->assertEquals(18.0, round((float) $xl->unit_price, 2));
    }

    public function test_submit_production_payment_hides_order_until_paid_then_factory_sees_it(): void
    {
        Config::set('services.billplz.webhook_secret', 'testing-secret');

        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);
        $factory = $this->seedFactory($factoryUser);

        $project = Project::query()->create([
            'user_id' => $normal->id,
            'name' => 'Production Payment Test',
            'country_code' => 'MY',
        ]);

        Sanctum::actingAs($normal);
        $draft = $this->postJson("/api/projects/{$project->id}/orders/draft", [
            'factory_id' => $factory->id,
            'lines' => [
                ['size_code' => 'L', 'qty' => 2],
            ],
        ])->assertCreated();

        $orderId = (int) $draft->json('order.id');

        $submit = $this->postJson("/api/orders/{$orderId}/submit-production", [
            'channel' => 'billplz',
        ])
            ->assertCreated()
            ->assertJsonPath('order.shipping_status', 'payment_pending')
            ->assertJsonPath('payment.purpose', 'production_order')
            ->assertJsonPath('payment.amount', 28);

        $paymentId = (int) $submit->json('payment.id');
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'order_id' => $orderId,
            'purpose' => 'production_order',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($factoryUser);
        $this->getJson('/api/factory/orders')
            ->assertOk()
            ->assertJsonCount(0, 'orders');

        $body = json_encode(['payment_id' => $paymentId, 'status' => 'paid'], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $body, 'testing-secret');

        $this->withHeaders(['X-Billplz-Signature' => $signature])
            ->postJson('/api/webhooks/billplz', ['payment_id' => $paymentId, 'status' => 'paid'])
            ->assertOk();

        $this->assertSame('pending_production', Order::query()->findOrFail($orderId)->shipping_status);
        $this->assertSame('paid', Payment::query()->findOrFail($paymentId)->status);

        Sanctum::actingAs($factoryUser);
        $this->getJson('/api/factory/orders')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $orderId)
            ->assertJsonPath('orders.0.shipping_status', 'pending_production');
    }

    public function test_factory_can_update_pricing_matrix(): void
    {
        $factoryUser = User::factory()->create(['role' => 'factory', 'country_code' => 'MY']);

        Factory::query()->create([
            'user_id' => $factoryUser->id,
            'name' => 'Pricing Lab',
            'country_code' => 'MY',
            'base_price' => 1,
            'active' => true,
        ]);

        Sanctum::actingAs($factoryUser);

        $this->putJson('/api/factory/pricing', [
            'sizes' => [
                ['size_code' => 'xs', 'price' => 12],
                ['size_code' => 'XL', 'price' => 0],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('sizes.0.code', 'XS')
            ->assertJsonPath('sizes.0.price', 12);

        $this->assertDatabaseHas('factory_size_prices', [
            'size_code' => 'XS',
            'price' => 12,
        ]);
        $this->assertDatabaseMissing('factory_size_prices', [
            'size_code' => 'XL',
        ]);
    }

    public function test_normal_calling_factory_pricing_returns_403(): void
    {
        $normal = User::factory()->create(['role' => 'normal', 'country_code' => 'MY']);
        Sanctum::actingAs($normal);

        $this->getJson('/api/factory/pricing')->assertForbidden();
        $this->putJson('/api/factory/pricing', ['sizes' => []])->assertForbidden();
    }
}
