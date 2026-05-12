<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Factory extends Model
{
    protected $fillable = ['user_id', 'name', 'country_code', 'base_price', 'active', 'ai_print_profile'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'base_price' => 'decimal:2',
            'ai_print_profile' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sizePrices(): HasMany
    {
        return $this->hasMany(FactorySizePrice::class);
    }

    /** @return Collection<int, FactorySizePrice> */
    public function pricedSizes(): HasMany
    {
        return $this->hasMany(FactorySizePrice::class)->where('price', '>', 0);
    }
}
