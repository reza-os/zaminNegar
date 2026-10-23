<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManagerAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $branchId = null): User
    {
        $id = bin2hex(random_bytes(5));
        return User::create([
            'name' => 'User '.$id,
            'username' => 'u'.$id,
            'email' => $id.'@example.test',
            'password' => 'Strong-Test-Password-2026',
            'is_active' => true,
            'role' => $role,
            'branch_id' => $branchId,
        ]);
    }

    public function test_every_manager_can_read_global_and_other_managers_branch_analytics(): void
    {
        $managerA = $this->actor('manager');
        $managerB = $this->actor('manager');
        $branchA = Branch::create(['name' => 'شعبه یک', 'manager_id' => $managerA->id]);
        $branchB = Branch::create(['name' => 'شعبه دو', 'manager_id' => $managerB->id]);
        $employeeA = $this->actor('employee', $branchA->id);
        $employeeB = $this->actor('employee', $branchB->id);
        SurveyCase::create(['case_number' => 'DASH-A', 'owner_full_name' => 'First',
            'branch_id' => $branchA->id, 'created_by' => $employeeA->id]);
        SurveyCase::create(['case_number' => 'DASH-B', 'owner_full_name' => 'Second',
            'branch_id' => $branchB->id, 'created_by' => $employeeB->id]);
        // A legacy case without a branch must not appear in shared management reports.
        SurveyCase::create(['case_number' => 'DASH-OLD', 'owner_full_name' => 'Old',
            'created_by' => $employeeA->id]);
        ImportBatch::create(['user_id' => $employeeB->id, 'branch_id' => $branchB->id,
            'file_name' => 'demo.xlsx', 'original_file_name' => 'demo.xlsx', 'success_rows' => 5]);
        ActivityLog::create(['user_id' => $employeeB->id, 'branch_id' => $branchB->id,
            'action' => 'case_created']);

        foreach ([$managerA, $managerB] as $manager) {
            Sanctum::actingAs($manager);
            $this->getJson('/api/manager/dashboard?scope=all')->assertOk()
                ->assertJsonPath('summary.total_cases', 2)
                ->assertJsonPath('summary.branches', 2)
                ->assertJsonPath('summary.import_batches', 1)
                ->assertJsonPath('summary.imported_rows', 5);
            $this->getJson('/api/manager/dashboard?scope=branch&id='.$branchB->id)->assertOk()
                ->assertJsonPath('subject.id', $branchB->id)
                ->assertJsonPath('summary.total_cases', 1)
                ->assertJsonPath('summary.activities', 1);
            $this->getJson('/api/manager/dashboard?scope=employee&id='.$employeeB->id)->assertOk()
                ->assertJsonPath('summary.total_cases', 1)
                ->assertJsonPath('subject.branch_name', 'شعبه دو');
            $this->getJson('/api/manager/dashboard/options?type=branch&search=دو')
                ->assertOk()->assertJsonPath('total', 1);
        }
    }

    public function test_employee_cannot_read_manager_dashboard_or_selection_lists(): void
    {
        Sanctum::actingAs($this->actor('employee'));
        $this->getJson('/api/manager/dashboard')->assertForbidden();
        $this->getJson('/api/manager/dashboard?scope=employee&id=1')->assertForbidden();
        $this->getJson('/api/manager/dashboard/options?type=employee')->assertForbidden();
    }

    public function test_dashboard_scopes_validate_inputs_and_do_not_expose_manager_as_employee(): void
    {
        $manager = $this->actor('manager');
        Sanctum::actingAs($manager);
        $this->getJson('/api/manager/dashboard?scope=employee')->assertUnprocessable();
        $this->getJson('/api/manager/dashboard?scope=employee&id='.$manager->id)->assertNotFound();
        $this->getJson('/api/manager/dashboard?scope=not-allowed')->assertUnprocessable();
        $this->getJson('/api/manager/dashboard/options?type=admin')->assertUnprocessable();
    }

    public function test_status_totals_cover_cases_without_status(): void
    {
        $manager = $this->actor('manager');
        $branch = Branch::create(['name' => 'شعبه آمار', 'manager_id' => $manager->id]);
        $employee = $this->actor('employee', $branch->id);
        SurveyCase::create(['case_number' => 'DASH-STATUS', 'owner_full_name' => 'Owner',
            'branch_id' => $branch->id, 'created_by' => $employee->id]);
        Sanctum::actingAs($manager);
        $response = $this->getJson('/api/manager/dashboard')->assertOk();
        $group = collect($response->json('status_groups'))->firstWhere('key', 'case_status');
        $this->assertSame(1, array_sum(array_column($group['items'], 'count')));
        $this->assertSame(1, $response->json('summary.total_cases'));
    }
}
