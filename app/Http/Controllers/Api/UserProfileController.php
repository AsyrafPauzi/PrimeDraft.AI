<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'country_code' => ['sometimes', 'string', 'size:2'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_registration_no' => ['sometimes', 'nullable', 'string', 'max:120'],
            'billing_line1' => ['sometimes', 'nullable', 'string', 'max:255'],
            'billing_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'billing_city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'billing_state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'billing_postcode' => ['sometimes', 'nullable', 'string', 'max:32'],
            'receiver_line1' => ['sometimes', 'nullable', 'string', 'max:255'],
            'receiver_line2' => ['sometimes', 'nullable', 'string', 'max:255'],
            'receiver_city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'receiver_state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'receiver_postcode' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);

        if (array_key_exists('country_code', $validated)) {
            $validated['country_code'] = strtoupper($validated['country_code']);
        }

        $user->fill($validated);
        $user->save();

        return response()->json([
            'user' => $user->fresh(),
        ]);
    }
}
