<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExcelRevisionService;
use Illuminate\Http\Request;

final class ExcelRevisionController extends Controller
{
    public function preview(Request $request,ExcelRevisionService $service) {
        abort_unless($request->user()->isEmployee() && $request->user()->branch?->is_active,403);
        $request->validate(['file'=>['required','file','mimes:xlsx,xls','max:10240']]);
        return response()->json($service->preview($request->file('file'),$request->user()));
    }
    public function apply(Request $request,ExcelRevisionService $service) {
        abort_unless($request->user()->isEmployee() && $request->user()->branch?->is_active,403);
        $data=$request->validate(['token'=>['required','string','size:64']]);
        return response()->json($service->apply($data['token'],$request->user()));
    }
}
