<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\SurveyCaseController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class);
    Route::get('/lookups', [LookupController::class, 'index']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::apiResource('survey-cases', SurveyCaseController::class);

    Route::post('/imports', [ImportController::class, 'store']);
    Route::get('/imports/{importBatch}', [ImportController::class, 'show']);
});
