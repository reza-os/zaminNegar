<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinanceAndExcelRevisionSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role, ?int $branchId = null): User
    {
        $suffix = bin2hex(random_bytes(5));
        return User::create([
            'name' => 'کاربر '.$suffix,
            'username' => 'staff'.$suffix,
            'email' => $suffix.'@example.test',
            'password' => 'TestPassword!123',
            'role' => $role,
            'branch_id' => $branchId,
            'is_active' => true,
        ]);
    }

    public function test_missing_operational_case_produces_validation_error_not_model_exception(): void
    {
        $manager=$this->staff('manager');
        Sanctum::actingAs($manager);
        $this->postJson('/api/manager/finance/invoices', [
            'case_id' => 999999999, 'number' => 'INV-TEST-001',
            'issued_at_jalali' => '1405/07/01', 'amount' => 1000,
            'paid_amount' => 0,
        ])->assertStatus(422)->assertJsonValidationErrors('case_id');
    }

    public function test_invoice_uses_shamsi_dates_and_existing_case(): void
    {
        $manager=$this->staff('manager');
        $branch=Branch::create(['name'=>'شعبه تست', 'manager_id'=>$manager->id]);
        $employee=$this->staff('employee',$branch->id);
        $case=SurveyCase::create(['case_number'=>'CASE-77', 'owner_full_name'=>'مالک تست',
            'branch_id'=>$branch->id,'created_by'=>$employee->id]);
        Sanctum::actingAs($manager);
        $this->postJson('/api/manager/finance/invoices', [
            'case_id'=>$case->id,'number'=>'INV-TEST-001',
            'issued_at_jalali'=>'1405/07/01','due_at_jalali'=>'1405/07/15',
            'amount'=>200000,'paid_amount'=>10000,
        ])->assertCreated();
        $row=\DB::table('financial_invoices')->first();
        $this->assertSame($case->id,(int)$row->survey_case_id);
        $this->assertMatchesRegularExpression('/^20\\d{2}-\\d{2}-\\d{2}$/',(string)$row->issued_at);
    }

    public function test_deleted_case_activity_displays_owner_name_from_snapshot(): void
    {
        $log=new ActivityLog([
            'action'=>'case_deleted', 'description'=>'حذف پرونده: CASE-77',
            'old_values'=>['owner_full_name'=>'مالک تست','case_number'=>'CASE-77'],
        ]);
        $this->assertStringContainsString('مالک تست',$log->description);
        $this->assertStringContainsString('CASE-77',$log->description);
    }

    public function test_employee_cannot_access_financial_import(): void
    {
        $employee=$this->staff('employee');
        Sanctum::actingAs($employee);
        $this->postJson('/api/manager/finance/expenses/import',[])->assertForbidden();
        $this->getJson('/api/manager/finance/case-options?search=CASE')->assertForbidden();
    }
}
