<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Factory extends Model
{
    protected $fillable = ['user_id', 'name', 'country_code', 'base_price', 'active'];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'base_price' => 'decimal:2',
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

    /** @return \Illuminate\Database\Eloquent\Collection<int, FactorySizePrice> */
    public function pricedSizes(): HasMany
    {
        return $this->hasMany(FactorySizePrice::class)->where('price', '>', 0);
    }
}

