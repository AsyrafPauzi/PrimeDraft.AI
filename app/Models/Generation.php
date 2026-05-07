<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Generation extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'prompt',
        'provider',
        'status',
        'cost',
        'output_url',
    ];
}
