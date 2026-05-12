<?php

return [

    'max_user_prompt_chars' => (int) env('AI_PRINT_MAX_PROMPT_CHARS', 500),

    /**
     * Default factory / print profile merged into every image-generation prompt.
     * Per-factory overrides: factories.ai_print_profile (JSON).
     */
    'default_factory_profile' => [
        'factory_name' => 'DEFAULT DTF FACTORY',
        'print_type' => 'DTF',
        'format' => ['png'],
        'background' => 'transparent',
        'min_dpi' => 300,
        'max_colors' => 'unlimited',
        'min_line_thickness_px' => 2,
        'safe_margin_px' => 50,
        'max_file_size_mb' => 25,
        'allow_gradients' => true,
        'allow_photorealism' => false,
        'text_rules' => [
            'min_font_size_px' => 24,
            'must_be_bold' => true,
        ],
    ],

    /**
     * Case-insensitive substring blocklist (merchandise AI only). Extend as needed.
     */
    'blocked_prompt_substrings' => [
        'child porn', 'cp ', 'rape', 'bestiality', 'incest', 'nazi swastika',
        'counterfeit', 'fake currency', 'terrorist',
    ],

    /**
     * If the image API rejects a prompt for policy/safety, retry once with this prefix
     * (cannot auto-analyze pixels; this is best-effort prompt softening).
     */
    'retry_on_policy_error' => (bool) filter_var(env('AI_PRINT_RETRY_ON_POLICY_ERROR', 'true'), FILTER_VALIDATE_BOOLEAN),

    'retry_prompt_prefix' => 'Simplified merchandise graphic, flat bold shapes, very high contrast, no text smaller than 24px equivalent, transparent background, centered composition: ',

];
