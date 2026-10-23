<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AdminManagerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DailyMessageController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\ManagerBranchController;
use App\Http\Controllers\Api\ManagerEmployeeController;
use App\Http\Controllers\Api\ManagerAnalyticsController;
use App\Http\Controllers\Api\ManagerDataAccessController;
use App\Http\Controllers\Api\ManagerFinanceController;
use App\Http\Controllers\Api\SurveyCaseController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:8,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/daily-message', DailyMessageController::class);

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/managers', [AdminManagerController::class, 'index']);
        Route::post('/managers', [AdminManagerController::class, 'store'])->middleware('throttle:15,1');
    });

    Route::middleware('role:manager')->prefix('manager')->group(function () {
        Route::get('/dashboard', [ManagerAnalyticsController::class, 'overview']);
        Route::get('/finance', [ManagerFinanceController::class, 'overview']);
        Route::post('/finance/invoices', [ManagerFinanceController::class, 'addInvoice']);
        Route::post('/finance/expenses', [ManagerFinanceController::class, 'addExpense']);
        Route::put('/finance/targets', [ManagerFinanceController::class, 'setTarget']);
        Route::get('/dashboard/options', [ManagerAnalyticsController::class, 'options']);
        Route::get('/branches', [ManagerBranchController::class, 'index']);
        Route::post('/branches', [ManagerBranchController::class, 'store']);
        Route::get('/branches/{branch}/cases', [ManagerBranchController::class, 'cases']);
        Route::get('/branches/{branch}', [ManagerBranchController::class, 'show']);
        Route::put('/branches/{branch}', [ManagerBranchController::class, 'update']);
        Route::delete('/branches/{branch}', [ManagerBranchController::class, 'destroy']);
        Route::get('/data-access/batches', [ManagerDataAccessController::class, 'batches']);
        Route::get('/data-access/cases', [ManagerDataAccessController::class, 'cases']);
        Route::get('/data-access/grants', [ManagerDataAccessController::class, 'grants']);
        Route::post('/data-access/grants', [ManagerDataAccessController::class, 'store']);
        Route::delete('/data-access/grants/{grant}', [ManagerDataAccessController::class, 'destroy']);
        Route::get('/employees', [ManagerEmployeeController::class, 'index']);
        Route::post('/employees', [ManagerEmployeeController::class, 'store'])->middleware('throttle:15,1');
        Route::patch('/employees/{employee}/branch', [ManagerEmployeeController::class, 'assign']);
        Route::put('/employees/{employee}', [ManagerEmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [ManagerEmployeeController::class, 'destroy']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });

    Route::middleware('role:employee,surveyor')->group(function () {
        Route::get('/lookups', [LookupController::class, 'index']);
        Route::get('/case-assignees', [SurveyCaseController::class, 'assignees']);
        Route::get('/dashboard', DashboardController::class);
        Route::get('/my-activities', [ActivityLogController::class, 'mine']);
        Route::post('/survey-cases', [SurveyCaseController::class, 'store']);
        Route::put('/survey-cases/{surveyCase}', [SurveyCaseController::class, 'update']);
        Route::patch('/survey-cases/{surveyCase}', [SurveyCaseController::class, 'update']);
        Route::post('/imports', [ImportController::class, 'store']);
        Route::get('/imports', [ImportController::class, 'index']);
        Route::get('/imports/{importBatch}/cases', [ImportController::class, 'cases']);
        Route::delete('/imports/{importBatch}', [ImportController::class, 'destroy']);
        Route::delete('/survey-cases/{surveyCase}', [SurveyCaseController::class, 'destroy']);
    });

    Route::middleware('role:employee,surveyor,manager')->group(function () {
        Route::get('/survey-cases/filter-options', [SurveyCaseController::class, 'filterOptions']);
        Route::get('/survey-cases', [SurveyCaseController::class, 'index']);
        Route::get('/survey-cases/{surveyCase}', [SurveyCaseController::class, 'show']);
        Route::get('/imports/{importBatch}', [ImportController::class, 'show']);
    });
});
