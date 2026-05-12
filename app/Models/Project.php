<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'country_code',
        'status',
        'scratch_layout',
        'print_profile',
        'preflight_report',
        'generated_output_url',
        'locked_at',
    ];

    protected function casts(): array
    {
        return [
            'scratch_layout' => 'array',
            'preflight_report' => 'array',
            'locked_at' => 'datetime',
        ];
    }
}
