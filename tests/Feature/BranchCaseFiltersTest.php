<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchCaseFiltersTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, ?int $branch = null): User
    {
        $id = bin2hex(random_bytes(5));
        return User::create([
            'name' => $role . ' ' . $id,
            'username' => 'filter_' . $id,
            'email' => 'filter_' . $id . '@example.test',
            'password' => 'Test-Password-2026!',
            'role' => $role, 'is_active' => true, 'branch_id' => $branch,
        ]);
    }

    public function test_all_managers_can_filter_cases_of_any_specific_branch_but_not_other_branches(): void
    {
        $managerA = $this->user('manager');
        $managerB = $this->user('manager');
        $branchA = Branch::create(['name' => 'الف', 'manager_id' => $managerA->id]);
        $branchB = Branch::create(['name' => 'ب', 'manager_id' => $managerB->id]);
        $workerA = $this->user('employee', $branchA->id);
        $workerB = $this->user('employee', $branchB->id);

        SurveyCase::create(['case_number' => 'FILTER-A1', 'owner_full_name' => 'آزمایش یک',
            'village_name' => 'چنار', 'branch_id' => $branchA->id,
            'created_by' => $workerA->id, 'activity_state' => 'active',
            'registration_state' => 'registered']);
        SurveyCase::create(['case_number' => 'FILTER-A2', 'owner_full_name' => 'آزمایش دو',
            'village_name' => 'بلوط', 'branch_id' => $branchA->id,
            'created_by' => $workerA->id, 'activity_state' => 'inactive',
            'registration_state' => 'unregistered']);
        SurveyCase::create(['case_number' => 'FILTER-B1', 'owner_full_name' => 'آزمایش سه',
            'village_name' => 'چنار', 'branch_id' => $branchB->id,
            'created_by' => $workerB->id, 'activity_state' => 'active',
            'registration_state' => 'registered']);

        Sanctum::actingAs($managerB);
        $this->getJson("/api/manager/branches/{$branchA->id}/cases?activity_state=active&village=چنار")
            ->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.case_number', 'FILTER-A1');
        $this->getJson("/api/manager/branches/{$branchA->id}/cases?registration_state=unregistered")
            ->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.case_number', 'FILTER-A2');
        $this->getJson("/api/manager/branches/{$branchA->id}/cases?source=excel")
            ->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson("/api/manager/branches/{$branchB->id}/cases")
            ->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_employee_filters_only_own_cases_and_legacy_null_states_remain_unknown(): void
    {
        $manager = $this->user('manager');
        $branch = Branch::create(['name' => 'اصلی', 'manager_id' => $manager->id]);
        $first = $this->user('employee', $branch->id);
        $second = $this->user('employee', $branch->id);
        SurveyCase::create(['case_number' => 'MINE-FILTER', 'owner_full_name' => 'آزمایشی',
            'branch_id' => $branch->id, 'created_by' => $first->id,
            'village_name' => 'گلستان']);
        SurveyCase::create(['case_number' => 'OTHER-FILTER', 'owner_full_name' => 'همکار',
            'branch_id' => $branch->id, 'created_by' => $second->id,
            'village_name' => 'گلستان', 'activity_state' => 'inactive']);

        Sanctum::actingAs($first);
        $this->getJson('/api/survey-cases?activity_state=unset&village=گلستان')
            ->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.case_number', 'MINE-FILTER');
        $this->getJson('/api/survey-cases?activity_state=inactive')
            ->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson("/api/manager/branches/{$branch->id}/cases")->assertForbidden();
        $this->getJson('/api/survey-cases?activity_state=not-an-option')
            ->assertUnprocessable();
    }

    public function test_employee_can_set_explicit_states_while_managers_remain_read_only(): void
    {
        $manager = $this->user('manager');
        $branch = Branch::create(['name' => 'اصلی', 'manager_id' => $manager->id]);
        $employee = $this->user('employee', $branch->id);
        $case = SurveyCase::create(['case_number' => 'EDIT-FILTER',
            'owner_full_name' => 'مالک', 'branch_id' => $branch->id,
            'created_by' => $employee->id]);

        Sanctum::actingAs($employee);
        $this->putJson('/api/survey-cases/' . $case->id, [
            'case_number' => 'EDIT-FILTER', 'owner_full_name' => 'مالک',
            'activity_state' => 'active', 'registration_state' => 'registered',
        ])->assertOk();
        $this->assertDatabaseHas('survey_cases', ['id' => $case->id,
            'activity_state' => 'active', 'registration_state' => 'registered']);

        Sanctum::actingAs($manager);
        $this->putJson('/api/survey-cases/' . $case->id, [
            'case_number' => 'EDIT-FILTER', 'owner_full_name' => 'مالک جدید',
        ])->assertForbidden();
    }
}
