<?php

use Illuminate\Support\Facades\Route;

Route::get('/{path?}', function () {
    return view('primedraft');
})->where('path', '.*');
