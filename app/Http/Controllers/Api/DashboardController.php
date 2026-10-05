<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LookupItem;
use App\Models\SurveyCase;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $query = SurveyCase::query();

        if (!$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhere('assigned_user_id', $user->id)
                  ->orWhere('surveyor_id', $user->id);
            });
        }

        $base = clone $query;
        $statuses = LookupItem::where('group_key', 'case_status')->get();

        $statusCounts = $statuses->map(fn ($status) => [
            'id' => $status->id,
            'title' => $status->title,
            'color' => $status->color,
            'count' => (clone $query)->where('status_id', $status->id)->count(),
        ])->values();

        $recentCases = (clone $base)
            ->with(['status', 'stage', 'priority', 'assignedUser', 'surveyor'])
            ->latest()
            ->limit(10)
            ->get();

        $activities = ActivityLog::with('user:id,name,role')
            ->when(!$user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->limit(8)
            ->get();

        return response()->json([
            'stats' => [
                'total' => (clone $base)->count(),
                'new_today' => (clone $base)->whereDate('created_at', today())->count(),
                'needs_followup' => (clone $base)->whereDate('next_action_at', '<=', today())->count(),
                'active_financial_amount' => (clone $base)->sum('contract_amount'),
            ],
            'status_counts' => $statusCounts,
            'recent_cases' => $recentCases,
            'activities' => $activities,
        ]);
    }
}
