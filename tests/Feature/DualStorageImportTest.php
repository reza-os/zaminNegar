<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DualStorageImportTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $branchId = null): User
    {
        $key = bin2hex(random_bytes(5));
        return User::create([
            'name' => 'Sample '.$key, 'email' => $key.'@example.test',
            'username' => 'test'.$key, 'role' => $role,
            'password' => 'StrongPass123!', 'is_active' => true,
            'branch_id' => $branchId,
        ]);
    }

    private function csv(): string
    {
        $f = fopen('php://temp', 'w+');
        fputcsv($f, array_fill(0, 30, 'header'));
        $row = array_fill(0, 30, '');
        $row[2] = 'CASE-2026-7001';
        $row[3] = 'Sample Client';
        fputcsv($f, $row);
        rewind($f);
        $value = stream_get_contents($f);
        fclose($f);
        return $value;
    }

    private function import(string $csv)
    {
        return $this->post('/api/imports', [
            'file' => UploadedFile::fake()->createWithContent('sample.csv', $csv),
        ]);
    }

    public function test_operational_group_is_hard_deleted_but_archive_survives_reimport(): void
    {
        Storage::fake(config('filesystems.default', 'local'));
        $manager = $this->actor('manager');
        $branch = Branch::create(['name' => 'Sample Branch', 'manager_id' => $manager->id]);
        $firstEmployee = $this->actor('employee', $branch->id);
        $secondEmployee = $this->actor('employee', $branch->id);
        $csv = $this->csv();

        Sanctum::actingAs($firstEmployee);
        $first = $this->import($csv)->assertOk()->json('import_batch');
        $this->assertEquals(1, $first['success_rows']);
        $this->assertDatabaseCount('case_archives', 1);
        $this->assertDatabaseCount('archived_import_files', 1);
        $firstArchive = SurveyCase::firstOrFail()->case_archive_id;

        $this->delete('/api/imports/'.$first['id'])->assertOk();
        $this->assertDatabaseMissing('import_batches', ['id' => $first['id']]);
        $this->assertDatabaseCount('survey_cases', 0);
        $this->assertDatabaseCount('case_archives', 1);
        $this->assertDatabaseCount('archived_import_files', 1);

        Sanctum::actingAs($secondEmployee);
        $second = $this->import($csv)->assertOk()->json('import_batch');
        $this->assertEquals(1, $second['success_rows']);
        $this->assertDatabaseCount('survey_cases', 1);
        $this->assertDatabaseCount('case_archives', 1);
        $this->assertDatabaseCount('archived_import_files', 1);
        $this->assertEquals($firstArchive, SurveyCase::firstOrFail()->case_archive_id);
        $this->assertEquals($secondEmployee->id, SurveyCase::firstOrFail()->created_by);
        $this->assertEquals($branch->id, SurveyCase::firstOrFail()->branch_id);
    }

    public function test_deleted_manual_work_record_can_be_recreated_without_a_second_archive(): void
    {
        Storage::fake(config('filesystems.default', 'local'));
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Sample Branch','manager_id'=>$manager->id]);
        $employee = $this->actor('employee', $branch->id);
        Sanctum::actingAs($employee);
        $data = ['case_number'=>'MAN-2026-09','owner_full_name'=>'Sample Manual Client'];
        $this->postJson('/api/survey-cases', $data)->assertCreated();
        $oldId = SurveyCase::firstOrFail()->id;
        $this->delete('/api/survey-cases/'.$oldId)->assertOk();
        $this->assertDatabaseMissing('survey_cases', ['id'=>$oldId]);
        $this->assertDatabaseCount('case_archives', 1);
        $this->postJson('/api/survey-cases', $data)->assertCreated();
        $this->assertDatabaseCount('survey_cases', 1);
        $this->assertDatabaseCount('case_archives', 1);
    }

    public function test_manual_record_is_saved_to_archive(): void
    {
        Storage::fake(config('filesystems.default', 'local'));
        $manager = $this->actor('manager');
        $branch = Branch::create(['name' => 'Sample Branch', 'manager_id' => $manager->id]);
        $employee = $this->actor('employee', $branch->id);
        Sanctum::actingAs($employee);
        $this->postJson('/api/survey-cases', [
            'case_number' => 'MAN-2026-01', 'owner_full_name' => 'Sample Manual Client',
        ])->assertCreated();
        $this->assertDatabaseCount('case_archives', 1);
        $this->assertDatabaseCount('survey_cases', 1);
    }
}
