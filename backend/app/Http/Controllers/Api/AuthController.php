<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Выдает frontend-приложению токены Sanctum и отвечает за данные профиля.
 */
class AuthController extends Controller
{
    /**
     * Создает пользователя и сразу открывает сессию для React-клиента.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $user->createToken('frontend')->plainTextToken,
            ],
        ], 201);
    }

    /**
     * Проверяет пароль вручную, чтобы вернуть токен в том же формате, что и при регистрации.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $user = User::where('email', $credentials['email'])->first();

        // Ошибка привязана к email, чтобы Laravel вернул привычный validation payload для формы.
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
                'token' => $user->createToken('frontend')->plainTextToken,
            ],
        ]);
    }

    /**
     * Удаляет только текущий access token, не разлогинивая остальные устройства пользователя.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Возвращает данные текущего пользователя без чувствительных полей модели.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->userPayload($request->user()),
        ]);
    }

    /**
     * Обновляет профиль и требует старый пароль только когда пользователь меняет пароль.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (filled($data['password'] ?? null)) {
            // Без current_password смена пароля через украденную сессию была бы слишком простой.
            if (! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Текущий пароль указан неверно.'],
                ]);
            }

            $user->password = $data['password'];
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->save();

        return response()->json([
            'data' => $this->userPayload($user->refresh()),
        ]);
    }

    /**
     * Держит форму ответа одинаковой для register, login, me и update.
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'created_at' => $user->created_at?->toJSON(),
            'updated_at' => $user->updated_at?->toJSON(),
        ];
    }
}
