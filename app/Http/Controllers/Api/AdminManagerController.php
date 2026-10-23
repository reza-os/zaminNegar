<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminManagerController extends Controller
{
    public function index()
    {
        return response()->json(['data' => User::query()->where('role', 'manager')
            ->withCount('createdUsers')->latest('id')->get(['id', 'name', 'username', 'email', 'mobile', 'is_active', 'role', 'created_at'])]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', Rule::unique('users', 'username')],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'mobile' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:10', 'max:100'],
        ]);

        $manager = DB::transaction(function () use ($data, $request) {
            $manager = User::create([...$data, 'role' => 'manager', 'is_active' => true, 'created_by' => $request->user()->id]);
            ActivityLog::create(['user_id' => $request->user()->id, 'action' => 'manager_created',
                'description' => 'ایجاد حساب منیجر', 'subject_type' => User::class, 'subject_id' => $manager->id,
                'ip_address' => $request->ip(), 'user_agent' => $request->userAgent()]);
            return $manager;
        });

        return response()->json(['data' => $manager->only(['id', 'name', 'username', 'email', 'mobile', 'role', 'is_active'])], 201);
    }
}
