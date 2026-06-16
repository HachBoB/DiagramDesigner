<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'nvidia_nim' => [
        'key' => env('NVIDIA_NIM_API_KEY'),
        'base_url' => env('NVIDIA_NIM_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        'model' => env('NVIDIA_NIM_MODEL', 'openai/gpt-oss-20b'),
        'timeout' => (int) env('NVIDIA_NIM_TIMEOUT', 60),
        'connect_timeout' => (int) env('NVIDIA_NIM_CONNECT_TIMEOUT', 8),
        'max_tokens' => (int) env('NVIDIA_NIM_MAX_TOKENS', 550),
        'edit_max_tokens' => (int) env('NVIDIA_NIM_EDIT_MAX_TOKENS', 2200),
        'empty_retries' => (int) env('NVIDIA_NIM_EMPTY_RETRIES', 1),
        'fallback_models' => env('NVIDIA_NIM_FALLBACK_MODELS', 'nvidia/llama-3.1-nemotron-nano-8b-v1'),
        'execution_time_limit' => (int) env('NVIDIA_NIM_EXECUTION_TIME_LIMIT', 75),
        'verify_ssl' => env('NVIDIA_NIM_VERIFY_SSL', true),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
