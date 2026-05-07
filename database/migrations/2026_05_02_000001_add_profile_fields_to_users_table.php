<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('company_name')->nullable()->after('country_code');
            $table->string('company_registration_no', 120)->nullable()->after('company_name');
            $table->string('billing_line1')->nullable()->after('company_registration_no');
            $table->string('billing_line2')->nullable()->after('billing_line1');
            $table->string('billing_city')->nullable()->after('billing_line2');
            $table->string('billing_state', 120)->nullable()->after('billing_city');
            $table->string('billing_postcode', 32)->nullable()->after('billing_state');
            $table->string('receiver_line1')->nullable()->after('billing_postcode');
            $table->string('receiver_line2')->nullable()->after('receiver_line1');
            $table->string('receiver_city')->nullable()->after('receiver_line2');
            $table->string('receiver_state', 120)->nullable()->after('receiver_city');
            $table->string('receiver_postcode', 32)->nullable()->after('receiver_state');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'company_name',
                'company_registration_no',
                'billing_line1',
                'billing_line2',
                'billing_city',
                'billing_state',
                'billing_postcode',
                'receiver_line1',
                'receiver_line2',
                'receiver_city',
                'receiver_state',
                'receiver_postcode',
            ]);
        });
    }
};
