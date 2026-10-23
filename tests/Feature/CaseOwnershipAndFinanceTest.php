<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CaseOwnershipAndFinanceTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $branchId = null): User
    {
        $id = bin2hex(random_bytes(5));
        return User::create([
            'name'=>'Test '.$id, 'email'=>$id.'@example.test', 'username'=>'t'.$id,
            'password'=>'Unique-Strong-2026', 'is_active'=>true, 'role'=>$role,
            'branch_id'=>$branchId,
        ]);
    }

    public function test_employee_can_edit_and_delete_only_own_cases(): void
    {
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Test Branch', 'manager_id'=>$manager->id]);
        $first = $this->actor('employee',$branch->id);
        $second = $this->actor('employee',$branch->id);
        $a = SurveyCase::create(['case_number'=>'OWN-1','owner_full_name'=>'First',
            'created_by'=>$first->id,'branch_id'=>$branch->id]);
        $b = SurveyCase::create(['case_number'=>'OWN-2','owner_full_name'=>'Second',
            'created_by'=>$second->id,'branch_id'=>$branch->id]);
        Sanctum::actingAs($first);
        $this->deleteJson('/api/survey-cases/'.$b->id)->assertNotFound();
        $this->putJson('/api/survey-cases/'.$b->id,[
            'case_number'=>'OWN-2','owner_full_name'=>'Changed',
        ])->assertNotFound();
        $this->putJson('/api/survey-cases/'.$a->id,[
            'case_number'=>'OWN-1','owner_full_name'=>'Changed',
        ])->assertOk();
        $this->deleteJson('/api/survey-cases/'.$a->id)->assertOk();
        $this->assertSoftDeleted('survey_cases',['id'=>$a->id]);
        $this->assertDatabaseHas('survey_cases',['id'=>$b->id,'deleted_at'=>null]);
    }

    public function test_employee_can_view_and_remove_only_own_import_group(): void
    {
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Test Branch', 'manager_id'=>$manager->id]);
        $first = $this->actor('employee',$branch->id);
        $second = $this->actor('employee',$branch->id);
        $batchA = ImportBatch::create(['user_id'=>$first->id,'branch_id'=>$branch->id,
            'file_name'=>'a.xlsx','original_file_name'=>'a.xlsx','status'=>'completed']);
        $batchB = ImportBatch::create(['user_id'=>$second->id,'branch_id'=>$branch->id,
            'file_name'=>'b.xlsx','original_file_name'=>'b.xlsx','status'=>'completed']);
        $caseA = SurveyCase::create(['case_number'=>'GROUP-A','owner_full_name'=>'A',
            'created_by'=>$first->id,'branch_id'=>$branch->id,'import_batch_id'=>$batchA->id]);
        $caseB = SurveyCase::create(['case_number'=>'GROUP-B','owner_full_name'=>'B',
            'created_by'=>$second->id,'branch_id'=>$branch->id,'import_batch_id'=>$batchB->id]);
        Sanctum::actingAs($first);
        $this->getJson('/api/imports/'.$batchA->id.'/cases')->assertOk()->assertJsonPath('total',1);
        $this->getJson('/api/imports/'.$batchB->id.'/cases')->assertNotFound();
        $this->deleteJson('/api/imports/'.$batchB->id)->assertNotFound();
        $this->deleteJson('/api/imports/'.$batchA->id)->assertOk()->assertJsonPath('deleted_cases',1);
        $this->assertSoftDeleted('import_batches',['id'=>$batchA->id]);
        $this->assertSoftDeleted('survey_cases',['id'=>$caseA->id]);
        $this->assertDatabaseHas('survey_cases',['id'=>$caseB->id,'deleted_at'=>null]);
    }

    public function test_financial_metrics_rely_on_real_records_and_unauthorized_employee_cannot_view(): void
    {
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Financial Branch', 'manager_id'=>$manager->id]);
        $employee = $this->actor('employee',$branch->id);
        $case = SurveyCase::create(['case_number'=>'FIN-1','owner_full_name'=>'Contract',
            'created_by'=>$employee->id,'branch_id'=>$branch->id,'contract_amount'=>500,
            'received_amount'=>200]);
        Sanctum::actingAs($employee);
        $this->getJson('/api/manager/finance')->assertForbidden();
        Sanctum::actingAs($manager);
        $this->getJson('/api/manager/finance')->assertOk()
            ->assertJsonPath('contracts.total',500)
            ->assertJsonPath('contracts.remaining',300)
            ->assertJsonPath('invoices.count',0)
            ->assertJsonPath('invoices.average',null);
        $this->postJson('/api/manager/finance/invoices',[
            'case_number'=>'FIN-1','number'=>'INV-1','issued_at'=>now()->toDateString(),
            'due_at'=>now()->subDay()->toDateString(), 'amount'=>400,'paid_amount'=>100,
        ])->assertCreated();
        $this->postJson('/api/manager/finance/expenses',[
            'category'=>'transport','type'=>'direct','amount'=>30,
            'spent_at'=>now()->toDateString(), 'branch_id'=>$branch->id,
        ])->assertCreated();
        $this->getJson('/api/manager/finance')->assertOk()
            ->assertJsonPath('invoices.count',1)
            ->assertJsonPath('invoices.total',400)
            ->assertJsonPath('invoices.overdue_amount',300)
            ->assertJsonPath('expenses.total',30)
            ->assertJsonPath('estimated_profit.gross',470);
    }
}
