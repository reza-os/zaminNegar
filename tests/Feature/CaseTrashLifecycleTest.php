<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use App\Services\CaseArchiveService;
use App\Services\CaseLifecycleService;
use App\Services\ImportWorkDeletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CaseTrashLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $coworker;
    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $manager = User::create([
            'name' => 'Manager', 'email' => 'manager@test.local', 'password' => 'secret', 'role' => 'manager',
        ]);
        $this->branch = Branch::create([
            'name' => 'Branch One', 'code' => 'BR-01', 'manager_id' => $manager->id, 'is_active' => true,
        ]);
        $this->owner = User::create([
            'name' => 'Owner', 'email' => 'owner@test.local', 'password' => 'secret',
            'role' => 'employee', 'branch_id' => $this->branch->id,
        ]);
        $this->coworker = User::create([
            'name' => 'Coworker', 'email' => 'coworker@test.local', 'password' => 'secret',
            'role' => 'employee', 'branch_id' => $this->branch->id,
        ]);
    }

    private function createPayload(string $number = 'A-103'): array
    {
        return [
            'case_number' => $number,
            'owner_full_name' => 'علی رضایی',
            'national_code' => '0123456789',
            'branch_id' => $this->branch->id,
            'created_by' => $this->owner->id,
            'updated_by' => $this->owner->id,
        ];
    }

    public function test_owner_can_soft_delete_see_and_restore_same_case_id(): void
    {
        $case = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $archiveId = $case->case_archive_id;
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson('/api/survey-cases/'.$case->id)->assertOk();
        $this->assertSoftDeleted('survey_cases', ['id' => $case->id]);
        $this->getJson('/api/survey-cases/trash')->assertOk()->assertJsonFragment(['id' => $case->id]);
        $this->postJson('/api/survey-cases/'.$case->id.'/restore')->assertOk();
        $this->assertNotSoftDeleted('survey_cases', ['id' => $case->id]);
        $this->assertSame($archiveId, $case->fresh()->case_archive_id);
    }

    public function test_same_owner_reentering_trashed_case_restores_instead_of_creating_duplicate(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $created->delete();
        $result = app(CaseLifecycleService::class)->createOrRestore([
            ...$this->createPayload(), 'phone' => '09120000000',
        ], $this->owner, 'excel');
        $this->assertTrue($result['restored']);
        $this->assertSame($created->id, $result['case']->id);
        $this->assertSame(1, SurveyCase::withTrashed()->where('case_number', 'A-103')->count());
        $this->assertNull($created->fresh()->phone); // Plain re-import restores, never silently overwrites.
        $this->assertSame($created->case_archive_id, $created->fresh()->case_archive_id);
    }

    public function test_active_case_number_must_not_be_duplicated(): void
    {
        app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner);
    }

    public function test_changed_national_code_cannot_reactivate_deleted_case(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $created->delete();
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(CaseLifecycleService::class)->createOrRestore([
            ...$this->createPayload(), 'national_code' => '9876543210',
        ], $this->owner);
    }

    public function test_legacy_hard_deleted_case_can_be_reentered_by_original_owner_only(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $archiveId = $created->case_archive_id;
        $oldId = $created->id;
        $created->delete();
        app(CaseArchiveService::class)->removeWorkCase($created);
        $this->assertDatabaseMissing('survey_cases', ['id' => $oldId]);
        $result = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner);
        $this->assertFalse($result['restored']);
        $this->assertNotSame($oldId, $result['case']->id);
        $this->assertSame($archiveId, $result['case']->case_archive_id);
    }

    public function test_coworker_cannot_restore_or_see_owners_trashed_case(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $created->delete();
        $this->actingAs($this->coworker, 'sanctum')
            ->postJson('/api/survey-cases/'.$created->id.'/restore')->assertNotFound();
        $this->getJson('/api/survey-cases/trash')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_permanent_delete_does_not_destroy_encrypted_audit_archive(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        $archive = $created->case_archive_id;
        $created->delete();
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson('/api/survey-cases/'.$created->id.'/permanent')->assertOk();
        $this->assertDatabaseMissing('survey_cases', ['id' => $created->id]);
        $this->assertDatabaseHas('case_archives', ['id' => $archive]);
    }

    public function test_invoice_blocks_permanent_deletion_but_not_soft_deletion(): void
    {
        $created = app(CaseLifecycleService::class)->createOrRestore($this->createPayload(), $this->owner)['case'];
        DB::table('financial_invoices')->insert([
            'survey_case_id' => $created->id, 'number' => 'INV-01', 'issued_at' => now()->toDateString(),
            'amount' => 100, 'paid_amount' => 0, 'created_by' => $this->owner->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson('/api/survey-cases/'.$created->id)->assertOk();
        $this->deleteJson('/api/survey-cases/'.$created->id.'/permanent')->assertStatus(409);
        $this->assertSoftDeleted('survey_cases', ['id' => $created->id]);
    }

    public function test_deleting_import_group_only_soft_deletes_cases(): void
    {
        $batch = ImportBatch::create([
            'user_id' => $this->owner->id, 'branch_id' => $this->branch->id,
            'file_name' => 'nonexistent.xlsx', 'original_file_name' => 'cases.xlsx',
            'status' => 'completed',
        ]);
        $created = app(CaseLifecycleService::class)->createOrRestore([
            ...$this->createPayload(), 'import_batch_id' => $batch->id,
        ], $this->owner, 'excel', $batch)['case'];
        $count = app(ImportWorkDeletionService::class)->deleteBatch($batch);
        $this->assertSame(1, $count);
        $this->assertSoftDeleted('survey_cases', ['id' => $created->id]);
        $this->assertSoftDeleted('import_batches', ['id' => $batch->id]);
        $this->assertDatabaseHas('case_archives', ['id' => $created->case_archive_id]);
    }
}
