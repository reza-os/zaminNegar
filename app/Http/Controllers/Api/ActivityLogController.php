<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\Visibility;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function mine(Request $request)
    {
        abort_unless($request->user()->isEmployee(), 403);

        $perPage = max(5, min(30, (int) $request->query('per_page', 15)));
        $logs = ActivityLog::query()
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate($perPage);

        return response()->json($logs);
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->isManager(), 403);

        $limit = (int) $request->query('limit', 30);
        $limit = max(10, min($limit, 100));

        $activities = Visibility::activities(ActivityLog::query()->with('user:id,name,role'), $request->user())
            ->latest('id')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $activities,
        ]);
    }
}
