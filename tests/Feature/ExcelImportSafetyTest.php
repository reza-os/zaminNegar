<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\ImportError;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExcelImportSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role, ?int $branchId = null): User
    {
        $rand = bin2hex(random_bytes(5));
        return User::create([
            'name' => 'Test '.$rand, 'email' => $rand.'@example.test',
            'username' => 't'.$rand, 'role' => $role,
            'password' => 'Unique-Strong-2026', 'is_active' => true,
            'branch_id' => $branchId,
        ]);
    }

    /** Column index 2 is case number, index 3 is full name. */
    private function sampleCsv(array $rows): string
    {
        $stream = fopen('php://temp', 'w+');
        fputcsv($stream, array_map(fn ($i) => 'column-'.$i, range(1, 30)));
        foreach ($rows as [$number, $name]) {
            $columns = array_fill(0, 30, '');
            $columns[2] = $number;
            $columns[3] = $name;
            fputcsv($stream, $columns);
        }
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        return $csv;
    }

    private function uploadCsv(string $csv, bool $confirmed = false)
    {
        return $this->withHeader('Accept', 'application/json')->post('/api/imports', [
            'file' => UploadedFile::fake()->createWithContent('test.csv', $csv),
            'confirm_duplicate' => $confirmed ? '1' : '0',
        ]);
    }

    public function test_exact_file_needs_confirmation_and_blank_case_number_stays_stable(): void
    {
        Storage::fake(config('filesystems.default', 'local'));
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Demo Branch','manager_id'=>$manager->id]);
        $employee = $this->actor('employee',$branch->id);
        Sanctum::actingAs($employee);

        $csv = $this->sampleCsv([['', 'Person A']]);
        $first = $this->uploadCsv($csv)->assertOk()->json('import_batch');
        $this->assertSame(1, (int) $first['success_rows']);
        $this->assertSame(64, strlen($first['file_hash']));
        $this->assertDatabaseCount('survey_cases', 1);
        $savedCase = SurveyCase::query()->firstOrFail();
        $this->assertStringStartsWith('IMP-B'.$branch->id.'-', $savedCase->case_number);

        $duplicate = $this->uploadCsv($csv)->assertStatus(409)->assertJsonPath('code','duplicate_file');
        $duplicate->assertJsonPath('existing_batch.id', $first['id']);
        $this->assertDatabaseCount('import_batches', 1);

        $second = $this->uploadCsv($csv, true)->assertOk()->json('import_batch');
        $this->assertSame(0, (int) $second['success_rows']);
        $this->assertSame(1, (int) $second['failed_rows']);
        $this->assertDatabaseCount('survey_cases', 1);
        $this->assertSame($savedCase->case_number, SurveyCase::firstOrFail()->case_number);
    }

    public function test_only_failed_rows_can_be_retried_and_exported(): void
    {
        Storage::fake(config('filesystems.default', 'local'));
        $manager = $this->actor('manager');
        $branch = Branch::create(['name'=>'Demo Branch','manager_id'=>$manager->id]);
        $employee = $this->actor('employee',$branch->id);
        $otherEmployee = $this->actor('employee',$branch->id);
        $collision = SurveyCase::create([
            'case_number' => 'ALREADY-1', 'owner_full_name' => 'Old person',
            'created_by' => $employee->id, 'branch_id' => $branch->id,
        ]);
        Sanctum::actingAs($employee);

        $csv = $this->sampleCsv([['CASE-NEW-1','New person'],['ALREADY-1','Collision']]);
        $batch = $this->uploadCsv($csv)->assertOk()->json('import_batch');
        $this->assertSame(1, (int) $batch['success_rows']);
        $this->assertSame(1, (int) $batch['failed_rows']);
        $this->get('/api/imports/'.$batch['id'].'/error-report')->assertOk();
        $this->assertSame(3, (int) ImportError::where('import_batch_id',$batch['id'])->firstOrFail()->row_number);

        Sanctum::actingAs($otherEmployee);
        $this->postJson('/api/imports/'.$batch['id'].'/retry-failed')->assertNotFound();
        $this->get('/api/imports/'.$batch['id'].'/error-report')->assertNotFound();

        $collision->forceDelete();
        Sanctum::actingAs($employee);
        $updated = $this->postJson('/api/imports/'.$batch['id'].'/retry-failed')
            ->assertOk()->json('import_batch');
        $this->assertSame(2, (int) $updated['success_rows']);
        $this->assertSame(0, (int) $updated['failed_rows']);
        $this->assertSame(0, ImportError::where('import_batch_id',$batch['id'])->count());
        $this->assertSame(2, SurveyCase::where('import_batch_id',$batch['id'])->count());
    }
}
