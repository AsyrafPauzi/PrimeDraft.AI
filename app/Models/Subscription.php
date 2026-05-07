<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $fillable = ['user_id', 'status', 'expires_at', 'grace_ends_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'grace_ends_at' => 'datetime',
        ];
    }
}
