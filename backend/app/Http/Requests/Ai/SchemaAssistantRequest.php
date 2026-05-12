<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SchemaAssistantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'question' => ['nullable', 'string', 'max:1000'],
            'mode' => ['sometimes', Rule::in(['review', 'edit'])],
            'project_name' => ['nullable', 'string', 'max:255'],
            'dialect' => ['nullable', 'string', 'max:50'],
            'schema_code' => ['nullable', 'string', 'max:30000'],
            'sql' => ['required', 'string', 'max:50000'],
            'schema_json' => ['nullable', 'array'],
        ];
    }
}
