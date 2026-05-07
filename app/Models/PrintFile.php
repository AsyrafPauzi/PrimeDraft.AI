<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrintFile extends Model
{
    protected $fillable = ['project_id', 'dpi', 'color_count', 'is_valid', 'validation_errors'];

    protected function casts(): array
    {
        return [
            'is_valid' => 'boolean',
            'validation_errors' => 'array',
        ];
    }
}
