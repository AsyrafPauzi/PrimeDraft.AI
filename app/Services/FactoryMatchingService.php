<?php

namespace App\Services;

use App\Models\Factory;
use App\Models\User;
use App\Support\ApparelSizes;
use Illuminate\Support\Collection;

class FactoryMatchingService
{
    public function matchingFactoriesFor(User $user, ?string $countryCodeOverride = null): Collection
    {
        $countryCode = strtoupper((string) ($countryCodeOverride ?? $user->country_code));

        return Factory::query()
            ->with('pricedSizes')
            ->withCount(['pricedSizes as priced_sizes_count'])
            ->where('active', true)
            ->where('country_code', $countryCode)
            ->orderByDesc('priced_sizes_count')
            ->orderBy('name')
            ->get()
            ->map(fn (Factory $factory): array => $this->serializeFactory($factory));
    }

    /**
     * @return array{id:int,name:string,country_code:string,base_price:float,sizes:list<array{code:string,price:float}>}
     */
    public function serializeFactory(Factory $factory): array
    {
        $rows = [];
        foreach ($factory->pricedSizes as $priceRow) {
            $rows[] = ['size_code' => $priceRow->size_code, 'price' => $priceRow->price];
        }

        return [
            'id' => $factory->id,
            'name' => $factory->name,
            'country_code' => $factory->country_code,
            'base_price' => (float) $factory->base_price,
            'sizes' => ApparelSizes::sortedPricedSizes($rows),
        ];
    }
}

