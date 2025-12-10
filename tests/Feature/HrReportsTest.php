<?php

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use function Pest\Laravel\actingAs;

beforeEach(function () {
    config(['app.asset_url' => 'test-assets']);
});

function createCompanyUserWithPermissions(array $permissions = []): User
{
    $user = User::factory()->create([
        'type' => 'company',
    ]);

    $role = Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web']);
    $user->assignRole($role);

    foreach ($permissions as $permissionName) {
        $permission = Permission::firstOrCreate(
            ['name' => $permissionName, 'guard_name' => 'web'],
            ['module' => 'reports']
        );
        $role->givePermissionTo($permission);
        $user->givePermissionTo($permission);
    }

    return $user;
}

function inertiaTestHeaders(): array
{
    if ($assetUrl = config('app.asset_url')) {
        $version = hash('xxh128', $assetUrl);
    } elseif (file_exists($manifest = public_path('build/manifest.json'))) {
        $version = hash_file('xxh128', $manifest);
    } elseif (file_exists($manifest = public_path('mix-manifest.json'))) {
        $version = hash_file('xxh128', $manifest);
    } else {
        $version = '';
    }

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version,
    ];
}

it('allows authorized users to view the absence report', function () {
    $user = createCompanyUserWithPermissions(['view-attendance-records']);

    actingAs($user);

    $this->withHeaders(inertiaTestHeaders())
        ->get(route('hr.reports.absence'))
        ->assertStatus(200);
});

it('forbids access to absence report without permission', function () {
    $user = createCompanyUserWithPermissions();

    actingAs($user);

    $this->withHeaders(inertiaTestHeaders())
        ->get(route('hr.reports.absence'))
        ->assertForbidden();
});

it('allows authorized users to view the turnover report', function () {
    $user = createCompanyUserWithPermissions(['view-turnover-report']);

    actingAs($user);

    $this->withHeaders(inertiaTestHeaders())
        ->get(route('hr.reports.turnover'))
        ->assertStatus(200);
});

it('forbids access to the turnover report without permission', function () {
    $user = createCompanyUserWithPermissions();

    actingAs($user);

    $this->withHeaders(inertiaTestHeaders())
        ->get(route('hr.reports.turnover'))
        ->assertForbidden();
});
