<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rfq extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'order_id',
        'title',
        'notes',
        'status',
        'quantity_summary',
        'awarded_bid_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity_summary' => 'array',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return HasMany<RfqBid, Rfq> */
    public function bids(): HasMany
    {
        return $this->hasMany(RfqBid::class);
    }

    public function awardedBid(): BelongsTo
    {
        return $this->belongsTo(RfqBid::class, 'awarded_bid_id');
    }
}
