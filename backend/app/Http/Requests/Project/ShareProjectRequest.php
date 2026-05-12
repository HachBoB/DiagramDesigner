<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShareProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'access' => ['required', Rule::in(['private', 'link', 'password'])],
            'permission' => ['sometimes', Rule::in(['view', 'edit'])],
            'password' => ['nullable', 'string', 'min:4', 'max:100'],
        ];
    }
}
