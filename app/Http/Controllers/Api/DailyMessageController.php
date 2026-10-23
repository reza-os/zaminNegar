<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyMessage;
use Carbon\CarbonImmutable;

class DailyMessageController extends Controller
{
    public function __invoke()
    {
        $messages = DailyMessage::where('is_active', true)->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'type', 'content', 'author']);
        if ($messages->isEmpty()) {
            return response()->json(['data' => null, 'date' => now('Asia/Tehran')->toDateString()]);
        }

        // Calendar-based sequence: every user sees the same message on the same Tehran day.
        $today = CarbonImmutable::now('Asia/Tehran')->startOfDay();
        $anchor = CarbonImmutable::parse('2026-01-01', 'Asia/Tehran')->startOfDay();
        $days = (int) $anchor->diffInDays($today, false);
        $index = (($days % $messages->count()) + $messages->count()) % $messages->count();
        return response()->json(['data' => $messages[$index], 'date' => $today->toDateString()]);
    }
}
