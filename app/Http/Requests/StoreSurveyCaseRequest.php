<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSurveyCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'case_number' => ['nullable', 'string', 'max:255', 'unique:survey_cases,case_number'],
            'case_date' => ['nullable', 'date'],
            'case_date_jalali' => ['nullable', 'string', 'max:50'],
            'owner_full_name' => ['required', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'national_code' => ['nullable', 'string', 'max:20'],
            'birth_date' => ['nullable', 'date'],
            'birth_date_jalali' => ['nullable', 'string', 'max:50'],
            'village_name' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:30'],
            'file_location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'surveyor_id' => ['nullable', 'exists:users,id'],
            'surveyor_name_raw' => ['nullable', 'string', 'max:255'],
            'status_id' => ['nullable', 'exists:lookup_items,id'],
            'stage_id' => ['nullable', 'exists:lookup_items,id'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'priority_id' => ['nullable', 'exists:lookup_items,id'],
            'last_action_at' => ['nullable', 'date'],
            'next_action' => ['nullable', 'string', 'max:255'],
            'next_action_at' => ['nullable', 'date'],
            'followup_status_id' => ['nullable', 'exists:lookup_items,id'],
            'stop_reason_id' => ['nullable', 'exists:lookup_items,id'],
            'contract_amount' => ['nullable', 'numeric', 'min:0'],
            'received_amount' => ['nullable', 'numeric', 'min:0'],
            'customer_source_id' => ['nullable', 'exists:lookup_items,id'],
            'financial_status_id' => ['nullable', 'exists:lookup_items,id'],
            'physical_status_id' => ['nullable', 'exists:lookup_items,id'],
            'archive_code' => ['nullable', 'string', 'max:255'],
        ];
    }
}
