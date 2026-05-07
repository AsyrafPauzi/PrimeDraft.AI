<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Invalid email or password.'], 422);
        }

        $token = $user->createToken('primedraft-api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function requestOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $otp = OtpCode::create([
            'phone' => $validated['phone'],
            'token' => (string) Str::uuid(),
            'code' => '123456',
            'expires_at' => now()->addMinutes(5),
            'used' => false,
        ]);

        return response()->json([
            'otp_token' => $otp->token,
            'code' => $otp->code,
        ]);
    }

    public function signup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'otp_token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:normal,freelancer,factory'],
        ]);

        $otp = OtpCode::query()
            ->where('token', $validated['otp_token'])
            ->where('used', false)
            ->firstOrFail();

        abort_if($otp->expires_at->isPast() || $otp->code !== $validated['code'], 422, 'Invalid OTP.');

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $otp->phone,
            'password' => $validated['password'],
            'role' => $validated['role'],
            'phone_verified' => true,
            'country_code' => 'MY',
        ]);

        $otp->update(['used' => true]);

        $token = $user->createToken('primedraft-api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }
}
