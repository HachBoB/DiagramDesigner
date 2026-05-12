<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'dialect' => ['sometimes', 'string', 'max:50'],
            'schema_code' => ['sometimes', 'nullable', 'string'],
            'schema_json' => ['sometimes', 'nullable', 'array'],
            'is_favorite' => ['sometimes', 'boolean'],
            'last_opened_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
