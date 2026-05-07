<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\UserProfileController;
use App\Http\Controllers\Api\BillplzWebhookController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EditorController;
use App\Http\Controllers\Api\FactoryController;
use App\Http\Controllers\Api\GenerationController;
use App\Http\Controllers\Api\ProjectDraftOrderController;
use App\Http\Controllers\Api\PrintValidationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UserOrdersController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/request-otp', [AuthController::class, 'requestOtp']);
Route::post('/auth/signup', [AuthController::class, 'signup']);
Route::post('/webhooks/billplz', [BillplzWebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::patch('/me', [UserProfileController::class, 'update']);
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/billing/subscription/status', [BillingController::class, 'subscriptionStatus']);
    Route::get('/billing/history', [BillingController::class, 'history']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/billing/subscription/verify', [BillingController::class, 'verifyFreelancerUpgrade']);
    Route::post('/billing/subscription/checkout', [BillingController::class, 'checkoutFreelancerSubscription']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::post('/projects/bulk', [ProjectController::class, 'bulkAction']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    Route::post('/projects/{project}/editor/scratch', [EditorController::class, 'saveScratch']);
    Route::get('/projects/{project}/editor/split-preview', [EditorController::class, 'splitPreview']);
    Route::post('/projects/{project}/orders/draft', [ProjectDraftOrderController::class, 'store']);
    Route::get('/orders', [UserOrdersController::class, 'index']);
    Route::post('/orders/{order}/submit-production', [UserOrdersController::class, 'submitProduction']);

    Route::post('/projects/{project}/generations', [GenerationController::class, 'store']);
    Route::post('/projects/{project}/print-files/validate', [PrintValidationController::class, 'validateFile']);

    Route::post('/projects/{project}/downloads/checkout', [BillingController::class, 'checkoutDownload']);
    Route::get('/projects/{project}/downloads/access', [BillingController::class, 'downloadAccess']);
    Route::post('/projects/{project}/downloads/high-res', [BillingController::class, 'downloadHighRes']);

    Route::get('/factories/matching', [FactoryController::class, 'matching']);
    Route::get('/factory/pricing', [FactoryController::class, 'pricingIndex'])->middleware('role:factory');
    Route::put('/factory/pricing', [FactoryController::class, 'pricingUpdate'])->middleware('role:factory');
    Route::get('/factory/orders', [FactoryController::class, 'orders'])->middleware('role:factory');
});
