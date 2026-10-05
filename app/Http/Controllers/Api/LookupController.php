<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LookupItem;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    public function index(Request $request)
    {
        $query = LookupItem::query()->where('is_active', true)->orderBy('sort_order')->orderBy('title');

        if ($request->filled('group_key')) {
            $query->where('group_key', $request->string('group_key'));
        }

        return response()->json(['data' => $query->get()]);
    }
}
