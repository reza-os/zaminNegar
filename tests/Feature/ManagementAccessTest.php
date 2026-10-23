<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\DailyMessage;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManagementAccessTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, array $extra = []): User
    {
        return User::create(array_merge([
            'name' => 'Test '.$role, 'username' => 'usr'.bin2hex(random_bytes(5)),
            'email' => bin2hex(random_bytes(6)).'@example.test',
            'password' => 'StrongDemo!123', 'role' => $role, 'is_active' => true,
        ], $extra));
    }

    public function test_only_main_admin_can_create_managers(): void
    {
        $admin = $this->user('admin');
        $employee = $this->user('employee');
        $payload = ['name'=>'مدیر یک', 'username'=>'manager1', 'email'=>'manager1@example.test', 'password'=>'StrongDemo!123'];

        Sanctum::actingAs($employee);
        $this->postJson('/api/admin/managers', $payload)->assertForbidden();
        Sanctum::actingAs($admin);
        $this->postJson('/api/admin/managers', $payload)->assertCreated()->assertJsonPath('data.role', 'manager');
        $this->assertDatabaseHas('users', ['email'=>'manager1@example.test','role'=>'manager','created_by'=>$admin->id]);
    }

    public function test_all_managers_see_all_branches_while_each_employee_sees_only_own_cases(): void
    {
        $m1 = $this->user('manager');
        $m2 = $this->user('manager');
        $b1 = Branch::create(['name'=>'شعبه یک', 'manager_id'=>$m1->id]);
        $b2 = Branch::create(['name'=>'شعبه دو', 'manager_id'=>$m2->id]);
        $e1 = $this->user('employee', ['branch_id'=>$b1->id,'created_by'=>$m1->id]);
        $e2 = $this->user('employee', ['branch_id'=>$b1->id,'created_by'=>$m2->id]);
        $case1 = SurveyCase::create(['case_number'=>'CASE-101', 'owner_full_name'=>'مالک اول', 'created_by'=>$e1->id, 'branch_id'=>$b1->id]);
        $case2 = SurveyCase::create(['case_number'=>'CASE-102', 'owner_full_name'=>'مالک دوم', 'created_by'=>$e2->id, 'branch_id'=>$b1->id]);
        SurveyCase::create(['case_number'=>'CASE-103', 'owner_full_name'=>'مالک سوم', 'created_by'=>$e2->id, 'branch_id'=>$b2->id]);
        $imp1 = ImportBatch::create(['user_id'=>$e1->id, 'branch_id'=>$b1->id,
            'file_name'=>'test-1.xlsx', 'original_file_name'=>'test-1.xlsx']);
        $imp2 = ImportBatch::create(['user_id'=>$e2->id, 'branch_id'=>$b2->id,
            'file_name'=>'test-2.xlsx', 'original_file_name'=>'test-2.xlsx']);
        ActivityLog::create(['user_id'=>$e1->id, 'branch_id'=>$b1->id, 'action'=>'case_created']);
        ActivityLog::create(['user_id'=>$e2->id, 'branch_id'=>$b2->id, 'action'=>'excel_imported']);
        ActivityLog::create(['user_id'=>$m2->id, 'action'=>'admin_only']);

        foreach ([$m1, $m2] as $manager) {
            Sanctum::actingAs($manager);
            $this->getJson('/api/manager/branches')->assertOk()->assertJsonCount(2, 'data');
            $this->getJson('/api/manager/branches/'.$b1->id)->assertOk()->assertJsonPath('totals.cases', 2);
            $this->getJson('/api/manager/branches/'.$b2->id)->assertOk()->assertJsonPath('totals.cases', 1);
            $this->getJson('/api/survey-cases')->assertOk()->assertJsonPath('meta.total', 3);
            $this->getJson('/api/imports/'.$imp1->id)->assertOk();
            $this->getJson('/api/imports/'.$imp2->id)->assertOk();
            $this->getJson('/api/manager/activity-logs')->assertOk()->assertJsonCount(2, 'data');
            $this->postJson('/api/survey-cases', ['case_number'=>'BANNED', 'owner_full_name'=>'x'])->assertForbidden();
        }

        Sanctum::actingAs($e1);
        $this->getJson('/api/survey-cases')->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/survey-cases/'.$case1->id)->assertOk();
        $this->getJson('/api/survey-cases/'.$case2->id)->assertNotFound();
        $this->getJson('/api/imports/'.$imp1->id)->assertOk();
        $this->getJson('/api/imports/'.$imp2->id)->assertNotFound();
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('my_performance.created_cases', 1)
            ->assertJsonPath('my_performance.excel_uploads', 1)
            ->assertJsonPath('my_performance.logged_activities', 1);
        $this->getJson('/api/manager/branches')->assertForbidden();
        $this->getJson('/api/my-activities')->assertOk()->assertJsonPath('total', 1);

        Sanctum::actingAs($e2);
        $this->getJson('/api/survey-cases')->assertOk()->assertJsonPath('meta.total', 2);
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('my_performance.created_cases', 2);
        $this->getJson('/api/my-activities')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_any_manager_can_create_employee_in_any_branch_and_assign_another_managers_employee(): void
    {
        $m1 = $this->user('manager');
        $m2 = $this->user('manager');
        $b1 = Branch::create(['name'=>'شعبه یک', 'manager_id'=>$m1->id]);
        $b2 = Branch::create(['name'=>'شعبه دو', 'manager_id'=>$m2->id]);
        $employee = $this->user('employee', ['branch_id'=>$b1->id, 'created_by'=>$m1->id]);

        Sanctum::actingAs($m2);
        $this->getJson('/api/manager/employees')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/manager/employees', [
            'name'=>'نیروی دوم', 'username'=>'crossbranch', 'email'=>'crossbranch@example.test',
            'password'=>'StrongDemo!123', 'branch_id'=>$b1->id,
        ])->assertCreated()->assertJsonPath('data.branch_id', $b1->id);
        $this->patchJson('/api/manager/employees/'.$employee->id.'/branch', [
            'branch_id'=>$b2->id,
        ])->assertOk()->assertJsonPath('data.branch_id', $b2->id);
        $this->assertDatabaseHas('users', ['id'=>$employee->id, 'branch_id'=>$b2->id]);
    }

    public function test_daily_message_is_stable_during_same_day(): void
    {
        $employee = $this->user('employee');
        DailyMessage::create(['content'=>'جمله نخست', 'sort_order'=>0]);
        DailyMessage::create(['content'=>'جمله دوم', 'sort_order'=>1]);
        Sanctum::actingAs($employee);
        $first = $this->getJson('/api/daily-message')->assertOk()->json('data.id');
        $second = $this->getJson('/api/daily-message')->assertOk()->json('data.id');
        $this->assertSame($first, $second);
    }
}
