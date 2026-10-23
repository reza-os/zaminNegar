<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LookupItem;
use App\Models\ImportBatch;
use App\Models\CaseAction;
use App\Models\SurveyCase;
use App\Support\Visibility;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $query = SurveyCase::query();

        Visibility::cases($query, $user);

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

        $activityQuery = ActivityLog::with('user:id,name,role');
        $activities = Visibility::activities($activityQuery, $user)->latest()->limit(8)->get();

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
            // Self-only employee performance numbers; these filters must never be replaced
            // by a branch_id filter because colleagues share a branch.
            'my_performance' => [
                'created_cases' => (clone $base)->count(),
                'excel_uploads' => ImportBatch::where('user_id', $user->id)->count(),
                'successful_excel_rows' => (int) ImportBatch::where('user_id', $user->id)->sum('success_rows'),
                'logged_activities' => ActivityLog::where('user_id', $user->id)->count(),
                'case_actions' => CaseAction::where('user_id', $user->id)->count(),
            ],
        ]);
    }
}
