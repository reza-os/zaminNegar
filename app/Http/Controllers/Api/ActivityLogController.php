<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'فقط مدیر به لیست کامل فعالیت‌ها دسترسی دارد.');
        }

        $limit = (int) $request->query('limit', 30);
        $limit = max(10, min($limit, 100));

        $activities = ActivityLog::query()
            ->with('user:id,name,role')
            ->latest('id')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $activities,
        ]);
    }
}
