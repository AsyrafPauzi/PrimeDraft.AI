<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\BillplzWebhookController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EditorCanvasImageController;
use App\Http\Controllers\Api\EditorController;
use App\Http\Controllers\Api\EditorFabricHighFidelityController;
use App\Http\Controllers\Api\EditorImagePipelineController;
use App\Http\Controllers\Api\FactoryController;
use App\Http\Controllers\Api\GenerationController;
use App\Http\Controllers\Api\PreflightController;
use App\Http\Controllers\Api\PrintValidationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectDraftOrderController;
use App\Http\Controllers\Api\RfqController;
use App\Http\Controllers\Api\UserOrdersController;
use App\Http\Controllers\Api\UserProfileController;
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
    Route::post('/projects/{project}/preflight', [PreflightController::class, 'store']);
    Route::get('/projects/{project}/preflight', [PreflightController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    Route::post('/projects/{project}/editor/scratch', [EditorController::class, 'saveScratch']);
    Route::post('/projects/{project}/editor/canvas-image', [EditorCanvasImageController::class, 'store']);
    Route::post('/projects/{project}/editor/fabric-high-fidelity', [EditorFabricHighFidelityController::class, 'store']);
    Route::post('/projects/{project}/editor/pipeline/upscale', [EditorImagePipelineController::class, 'upscale']);
    Route::post('/projects/{project}/editor/pipeline/remove-background', [EditorImagePipelineController::class, 'removeBackground']);
    Route::post('/projects/{project}/editor/pipeline/to-300dpi', [EditorImagePipelineController::class, 'to300Dpi']);
    Route::post('/projects/{project}/editor/pipeline/vectorize', [EditorImagePipelineController::class, 'vectorize']);
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
    Route::get('/factories/directory', [FactoryController::class, 'directory']);

    Route::get('/rfqs', [RfqController::class, 'indexMine']);
    Route::get('/rfqs/{rfq}', [RfqController::class, 'show']);
    Route::post('/projects/{project}/rfqs', [RfqController::class, 'store']);
    Route::post('/rfqs/{rfq}/bids', [RfqController::class, 'storeBid'])->middleware('role:factory');
    Route::post('/rfqs/{rfq}/accept', [RfqController::class, 'accept']);
    Route::get('/factory/pricing', [FactoryController::class, 'pricingIndex'])->middleware('role:factory');
    Route::put('/factory/pricing', [FactoryController::class, 'pricingUpdate'])->middleware('role:factory');
    Route::get('/factory/orders', [FactoryController::class, 'orders'])->middleware('role:factory');
    Route::get('/factory/rfqs', [RfqController::class, 'factoryInbox'])->middleware('role:factory');
});
