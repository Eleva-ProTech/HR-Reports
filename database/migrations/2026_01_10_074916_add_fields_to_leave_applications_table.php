<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leave_applications', function (Blueprint $table) {
            $table->string('supervisor')->nullable()->after('manager_comments');
            $table->string('shift')->nullable()->after('supervisor');
            $table->string('dayoff')->nullable()->after('shift');
            $table->text('comment')->nullable()->after('dayoff');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_applications', function (Blueprint $table) {
            $table->dropColumn(['supervisor', 'shift', 'dayoff', 'comment']);
        });
    }
};
