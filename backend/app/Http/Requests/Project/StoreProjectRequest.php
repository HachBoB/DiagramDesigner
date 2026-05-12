<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'dialect' => ['sometimes', 'string', 'max:50'],
            'schema_code' => ['nullable', 'string'],
            'schema_json' => ['nullable', 'array'],
            'is_favorite' => ['sometimes', 'boolean'],
        ];
    }
}
