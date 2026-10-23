<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchOwnedDataAccessTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role, array $more = []): User
    {
        return User::create(array_merge([
            'name' => 'کاربر تست',
            'username' => 'usr'.bin2hex(random_bytes(4)),
            'email' => bin2hex(random_bytes(5)).'@example.test',
            'password' => 'TestPassword!123',
            'role' => $role,
            'is_active' => true,
        ], $more));
    }

    public function test_deleted_importer_remains_attributed_and_manager_can_grant_and_revoke_access(): void
    {
        $manager = $this->staff('manager');
        $branch = Branch::create(['name' => 'شعبه مشترک', 'manager_id' => $manager->id]);
        $old = $this->staff('employee', ['name' => 'ثبت‌کننده قدیمی', 'branch_id' => $branch->id]);
        $new = $this->staff('employee', ['name' => 'کارمند جدید', 'branch_id' => $branch->id]);
        $batch = ImportBatch::create(['user_id'=>$old->id, 'branch_id'=>$branch->id,
            'file_name'=>'imports/test.xlsx','original_file_name'=>'test.xlsx','status'=>'completed']);
        $case = SurveyCase::create(['case_number'=>'ARCHIVE-001','owner_full_name'=>'مالک تست',
            'branch_id'=>$branch->id,'created_by'=>$old->id,'import_batch_id'=>$batch->id]);
        $old->delete();
        $this->assertSame('ثبت‌کننده قدیمی', $batch->fresh()->user->name);
        $this->assertSame('ثبت‌کننده قدیمی', $case->fresh()->creator->name);

        Sanctum::actingAs($new);
        $this->getJson('/api/survey-cases')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/imports')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/survey-cases/'.$case->id)->assertNotFound();
        $this->postJson('/api/manager/data-access/grants', [])->assertForbidden();

        Sanctum::actingAs($manager);
        $this->postJson('/api/manager/data-access/grants', [
            'employee_id'=>$new->id,'import_batch_id'=>$batch->id,'can_edit'=>false,
        ])->assertCreated()->assertJsonPath('data.can_edit', false);
        $this->getJson('/api/manager/data-access/batches')->assertOk()
            ->assertJsonPath('data.0.user.name', 'ثبت‌کننده قدیمی');

        Sanctum::actingAs($new);
        $this->getJson('/api/imports')->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/survey-cases')->assertOk()->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.can_edit', false);
        $this->getJson('/api/imports/'.$batch->id.'/cases')->assertOk()->assertJsonPath('total', 1);
        $this->putJson('/api/survey-cases/'.$case->id, [
            'case_number'=>$case->case_number,'owner_full_name'=>'نام جدید',
        ])->assertForbidden();
        $this->deleteJson('/api/survey-cases/'.$case->id)->assertForbidden();
        $this->deleteJson('/api/imports/'.$batch->id)->assertNotFound();

        Sanctum::actingAs($manager);
        $this->postJson('/api/manager/data-access/grants', [
            'employee_id'=>$new->id,'import_batch_id'=>$batch->id,'can_edit'=>true,
        ])->assertCreated()->assertJsonPath('data.can_edit', true);

        Sanctum::actingAs($new);
        $this->putJson('/api/survey-cases/'.$case->id, [
            'case_number'=>$case->case_number,'owner_full_name'=>'نام اصلاح‌شده',
        ])->assertOk();
        $this->assertDatabaseHas('survey_cases', [
            'id'=>$case->id, 'created_by'=>$old->id, 'branch_id'=>$branch->id,
            'owner_full_name'=>'نام اصلاح‌شده',
        ]);
        $this->deleteJson('/api/survey-cases/'.$case->id)->assertForbidden();

        Sanctum::actingAs($manager);
        $grantId = $this->getJson('/api/manager/data-access/grants?import_batch_id='.$batch->id)
            ->assertOk()->json('data.0.id');
        $this->deleteJson('/api/manager/data-access/grants/'.$grantId)->assertOk();
        Sanctum::actingAs($new);
        $this->getJson('/api/survey-cases/'.$case->id)->assertNotFound();
    }

    public function test_cross_branch_grants_are_rejected(): void
    {
        $manager = $this->staff('manager');
        $one = Branch::create(['name'=>'یک', 'manager_id'=>$manager->id]);
        $two = Branch::create(['name'=>'دو', 'manager_id'=>$manager->id]);
        $original = $this->staff('employee', ['branch_id'=>$one->id]);
        $other = $this->staff('employee', ['branch_id'=>$two->id]);
        $case = SurveyCase::create(['case_number'=>'CROSS-001','owner_full_name'=>'مالک',
            'branch_id'=>$one->id,'created_by'=>$original->id]);
        Sanctum::actingAs($manager);
        $this->postJson('/api/manager/data-access/grants', [
            'employee_id'=>$other->id,'survey_case_id'=>$case->id,'can_edit'=>false,
        ])->assertStatus(422);
        $this->assertDatabaseCount('case_access_grants',0);
    }
}
