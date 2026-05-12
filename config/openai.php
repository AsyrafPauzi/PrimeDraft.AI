<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenAI (Image API for editor canvas)
    |--------------------------------------------------------------------------
    |
    | Never commit real keys. Set OPENAI_API_KEY in .env only.
    | Image model: default gpt-image-2 (gpt-image-latest is often unavailable / invalid).
    |
    */

    'api_key' => env('OPENAI_API_KEY'),

    'image_model' => env('OPENAI_IMAGE_MODEL', 'gpt-image-2'),

    /**
     * Optional model for POST /v1/images/edits (PNG + prompt). When empty, high-fidelity uses generations only.
     */
    'image_edit_model' => env('OPENAI_IMAGE_EDIT_MODEL'),

    'timeout_seconds' => (int) env('OPENAI_TIMEOUT', 120),

    /** Default square size for garment-friendly assets (override per request when supported). */
    'default_size' => env('OPENAI_IMAGE_SIZE', '1024x1024'),

];
