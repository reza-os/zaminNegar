<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManagementCrudTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => 'Test '.$role,
            'username' => 'u'.bin2hex(random_bytes(5)),
            'email' => bin2hex(random_bytes(5)).'@example.test',
            'password' => 'StrongDemo!123',
            'role' => $role, 'is_active' => true,
        ], $extra));
    }

    public function test_any_manager_can_edit_other_managers_branch_and_cannot_delete_occupied_branch(): void
    {
        $owner = $this->makeUser('manager');
        $other = $this->makeUser('manager');
        $branch = Branch::create(['name' => 'قدیم', 'code' => 'T-001', 'manager_id' => $owner->id]);
        $employee = $this->makeUser('employee', ['branch_id' => $branch->id]);
        Sanctum::actingAs($other);
        $this->putJson('/api/manager/branches/'.$branch->id, [
            'name' => 'جدید', 'code' => 'T-001', 'city' => 'تهران', 'address' => '', 'is_active' => true,
        ])->assertOk()->assertJsonPath('data.name', 'جدید');
        $this->deleteJson('/api/manager/branches/'.$branch->id)->assertStatus(409);
        $this->assertDatabaseHas('branches', ['id' => $branch->id, 'deleted_at' => null]);
        $this->putJson('/api/manager/branches/'.$branch->id, [
            'name' => 'جدید', 'code' => 'T-001', 'city' => 'تهران', 'address' => '', 'is_active' => false,
        ])->assertStatus(409);
        $this->assertSame($branch->id, $employee->fresh()->branch_id);
    }

    public function test_soft_deletion_preserves_employee_cases_branch_history_and_logs(): void
    {
        $manager = $this->makeUser('manager');
        $branch = Branch::create(['name' => 'شعبه تست', 'manager_id' => $manager->id]);
        $staff = $this->makeUser('employee', ['branch_id' => $branch->id]);
        $case = SurveyCase::create([
            'case_number' => 'T-CASE-001', 'owner_full_name' => 'مالک', 'branch_id' => $branch->id, 'created_by' => $staff->id,
        ]);
        Sanctum::actingAs($manager);
        $this->deleteJson('/api/manager/employees/'.$staff->id)->assertOk();
        $this->assertSoftDeleted('users', ['id' => $staff->id]);
        $this->assertDatabaseHas('survey_cases', ['id' => $case->id, 'created_by' => $staff->id, 'branch_id' => $branch->id]);
        $this->getJson('/api/manager/branches/'.$branch->id)->assertOk()->assertJsonPath('totals.cases', 1);
        $this->deleteJson('/api/manager/branches/'.$branch->id)->assertOk();
        $this->assertSoftDeleted('branches', ['id' => $branch->id]);
        $this->getJson('/api/manager/branches')->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('survey_cases', ['id' => $case->id, 'branch_id' => $branch->id]);
        $this->assertDatabaseHas('activity_logs', ['action' => 'employee_deleted', 'subject_id' => $staff->id]);
        $this->assertDatabaseHas('activity_logs', ['action' => 'branch_deleted', 'subject_id' => $branch->id]);
    }

    public function test_manager_can_search_filter_and_update_staff_without_changing_role(): void
    {
        $firstManager = $this->makeUser('manager');
        $otherManager = $this->makeUser('manager');
        $one = Branch::create(['name' => 'یک', 'manager_id' => $firstManager->id]);
        $two = Branch::create(['name' => 'دو', 'manager_id' => $otherManager->id]);
        $staffOne = $this->makeUser('employee', ['name' => 'علی رضایی', 'branch_id' => $one->id]);
        $this->makeUser('employee', ['name' => 'حسن احمدی', 'branch_id' => $two->id]);
        Sanctum::actingAs($otherManager);
        $this->getJson('/api/manager/employees?branch_id='.$one->id.'&search='.urlencode('رضایی'))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $staffOne->id);
        $this->getJson('/api/manager/employees?search=nonexistent')->assertOk()->assertJsonPath('total', 0);
        $this->putJson('/api/manager/employees/'.$staffOne->id, [
            'name' => 'علی تستی', 'username' => $staffOne->username, 'email' => $staffOne->email,
            'mobile' => '09120000000', 'branch_id' => $two->id, 'is_active' => true,
            'role' => 'admin',
        ])->assertOk()->assertJsonPath('data.branch_id', $two->id);
        $this->assertDatabaseHas('users', ['id' => $staffOne->id, 'role' => 'employee', 'branch_id' => $two->id]);
        $this->assertDatabaseHas('activity_logs', ['action' => 'employee_updated', 'subject_id' => $staffOne->id]);
    }

    public function test_employees_cannot_use_management_mutations(): void
    {
        $manager = $this->makeUser('manager');
        $branch = Branch::create(['name' => 'یک', 'manager_id' => $manager->id]);
        $employee = $this->makeUser('employee', ['branch_id' => $branch->id]);
        Sanctum::actingAs($employee);
        $this->deleteJson('/api/manager/branches/'.$branch->id)->assertForbidden();
        $this->putJson('/api/manager/branches/'.$branch->id, [])->assertForbidden();
        $this->deleteJson('/api/manager/employees/'.$employee->id)->assertForbidden();
        $this->putJson('/api/manager/employees/'.$employee->id, [])->assertForbidden();
    }
}
