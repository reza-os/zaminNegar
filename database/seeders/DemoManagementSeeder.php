<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\CaseAction;
use App\Models\ImportBatch;
use App\Models\ImportError;
use App\Models\LookupItem;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Idempotent DEMO data for local / testing ONLY.
 * All identifiers are prefixed DEMO or use example.test emails to avoid real users.
 * These import batches represent historical metadata, not uploaded XLSX files.
 */
class DemoManagementSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment(['local', 'testing'])) {
            throw new RuntimeException('DemoManagementSeeder is disabled outside local/testing environments.');
        }

        $password = env('ZAMIN_DEMO_PASSWORD');
        if (!is_string($password) || strlen($password) < 12) {
            throw new RuntimeException('Set ZAMIN_DEMO_PASSWORD to 12+ characters in .env before running this seeder.');
        }

        $this->call([LookupItemSeeder::class, DailyMessageSeeder::class]);

        DB::transaction(function () use ($password) {
            $admin = $this->demoUser('demo.admin@example.test', 'ادمین آزمایشی', 'demo_admin', 'admin', $password);
            $managers = [
                $this->demoUser('demo.manager1@example.test', 'منیجر آزمایشی یک', 'demo_manager1', 'manager', $password, $admin),
                $this->demoUser('demo.manager2@example.test', 'منیجر آزمایشی دو', 'demo_manager2', 'manager', $password, $admin),
            ];

            foreach ($managers as $manager) {
                $this->log($admin, null, 'manager_created', 'ایجاد حساب منیجر آزمایشی', User::class, $manager->id);
            }

            $branchData = [
                ['code' => 'DEMO-TEH', 'name' => 'شعبه آزمایشی تهران', 'city' => 'تهران', 'address' => 'آدرس نمایشی تهران'],
                ['code' => 'DEMO-KRJ', 'name' => 'شعبه آزمایشی کرج', 'city' => 'کرج', 'address' => 'آدرس نمایشی کرج'],
                ['code' => 'DEMO-QZN', 'name' => 'شعبه آزمایشی قزوین', 'city' => 'قزوین', 'address' => 'آدرس نمایشی قزوین'],
            ];
            $statuses = LookupItem::where('group_key', 'case_status')->pluck('id', 'title');
            $stages = LookupItem::where('group_key', 'case_stage')->pluck('id', 'title');
            $priorities = LookupItem::where('group_key', 'priority')->pluck('id', 'title');
            $employeeNumber = 0;

            foreach ($branchData as $branchIndex => $branchInfo) {
                $creator = $managers[$branchIndex % count($managers)];
                // manager_id is a legacy column identifying the creator; it never limits read access.
                $branch = Branch::firstOrCreate(['code' => $branchInfo['code']], [
                    ...$branchInfo, 'manager_id' => $creator->id, 'is_active' => true,
                ]);
                $this->log($creator, $branch, 'branch_created', 'ثبت شعبه آزمایشی', Branch::class, $branch->id);

                for ($employeeIndex = 0; $employeeIndex < 2; $employeeIndex++) {
                    $employeeNumber++;
                    $employee = $this->demoUser(
                        'demo.employee'.$employeeNumber.'@example.test',
                        'کارمند آزمایشی '. $employeeNumber,
                        'demo_employee'.$employeeNumber,
                        'employee', $password, $managers[($employeeNumber - 1) % 2], $branch,
                    );
                    $manager = $managers[($employeeNumber - 1) % 2];
                    $this->log($manager, $branch, 'employee_created', 'ایجاد حساب کارمند آزمایشی', User::class, $employee->id);
                    $this->log($manager, $branch, 'employee_assigned', 'تخصیص کارمند به شعبه آزمایشی', User::class, $employee->id);
                    $this->log($employee, $branch, 'login', 'ورود آزمایشی به سامانه', User::class, $employee->id);

                    $batch = ImportBatch::firstOrCreate(
                        ['user_id' => $employee->id, 'file_name' => 'demo/import-'.$employeeNumber.'.xlsx'],
                        [
                            'branch_id' => $branch->id,
                            'original_file_name' => 'DEMO-'.$employeeNumber.'-پرونده‌ها.xlsx',
                            'total_rows' => 3, 'success_rows' => 2, 'failed_rows' => 1,
                            'status' => 'completed',
                            'started_at' => now()->subDays(9 - $employeeIndex - $branchIndex),
                            'finished_at' => now()->subDays(9 - $employeeIndex - $branchIndex)->addMinutes(3),
                        ],
                    );
                    ImportError::firstOrCreate(
                        ['import_batch_id' => $batch->id, 'row_number' => 3],
                        ['field_name' => 'case_number', 'error_message' => 'شماره پرونده در ردیف نمونه وارد نشده است.',
                            'row_data' => ['note' => 'رکورد کاملاً ساختگی برای آزمایش']],
                    );
                    $this->log($employee, $branch, 'excel_imported', 'بارگذاری آزمایشی اکسل: '.$batch->original_file_name, ImportBatch::class, $batch->id);

                    for ($caseIndex = 1; $caseIndex <= 3; $caseIndex++) {
                        $number = 'DEMO-'.$employeeNumber.'-'.str_pad((string) $caseIndex, 3, '0', STR_PAD_LEFT);
                        $date = now()->subDays(($employeeNumber * 3 + $caseIndex) % 18);
                        $case = SurveyCase::firstOrCreate(['case_number' => $number], [
                            'branch_id' => $branch->id,
                            'owner_full_name' => 'مالک ساختگی '.$employeeNumber.'-'.$caseIndex,
                            'village_name' => ['مزرعه نمونه', 'باغ نمونه', 'زمین نمونه'][($caseIndex - 1) % 3],
                            'description' => 'پرونده نمایشی — فقط برای محیط توسعه و آزمایش',
                            'case_date' => $date->toDateString(),
                            'created_by' => $employee->id,
                            'updated_by' => $employee->id,
                            'assigned_user_id' => $employee->id,
                            'surveyor_id' => $employee->id,
                            'import_batch_id' => $caseIndex <= 2 ? $batch->id : null,
                            'status_id' => $statuses[['جدید', 'در حال انجام', 'تکمیل‌شده'][($caseIndex - 1) % 3]] ?? null,
                            'stage_id' => $stages[['ثبت اولیه', 'پردازش نقشه', 'تحویل پرونده'][($caseIndex - 1) % 3]] ?? null,
                            'priority_id' => $priorities['عادی'] ?? null,
                            'last_action_at' => $date->toDateString(),
                            'next_action' => $caseIndex === 3 ? 'تماس با مالک (آزمایشی)' : null,
                            'next_action_at' => $caseIndex === 3 ? today()->toDateString() : null,
                            'archive_code' => 'DEMO-'.$branchInfo['code'].'-'.$employeeNumber,
                            'contract_amount' => 1000000 * ($caseIndex + 1),
                            'received_amount' => 500000 * $caseIndex,
                            'created_at' => $date,
                            'updated_at' => $date,
                        ]);
                        $this->log($employee, $branch, 'case_created', 'ثبت پرونده آزمایشی '.$number, SurveyCase::class, $case->id);
                        if ($caseIndex >= 2) {
                            CaseAction::firstOrCreate(
                                ['case_id' => $case->id, 'user_id' => $employee->id, 'title' => 'پیگیری آزمایشی'],
                                ['action_type' => 'followup', 'description' => 'ثبت فعالیت نمونه برای نمایش در گزارش کارمند',
                                    'action_date' => now()->subDays($caseIndex)->toDateString(), 'status_id' => $case->status_id],
                            );
                            $this->log($employee, $branch, 'case_updated', 'ویرایش/پیگیری پرونده آزمایشی '.$number, SurveyCase::class, $case->id);
                        }
                    }
                }
            }
        });

        $this->command?->info('Demo data inserted/reused: 1 admin, 2 managers, 3 branches, 6 employees, 18 cases, 6 imports and activity logs.');
        $this->command?->warn('Demo XLSX rows are metadata only; no spreadsheet files were uploaded.');
    }

    private function demoUser(string $email, string $name, string $username, string $role,
        string $password, ?User $creator = null, ?Branch $branch = null): User
    {
        return User::firstOrCreate(['email' => $email], [
            'name' => $name,
            'username' => $username,
            'password' => $password, // hashed automatically by User model cast
            'role' => $role,
            'is_active' => true,
            'created_by' => $creator?->id,
            'branch_id' => $branch?->id,
        ]);
    }

    private function log(User $actor, ?Branch $branch, string $action, string $description,
        ?string $subjectType, ?int $subjectId): void
    {
        ActivityLog::firstOrCreate([
            'user_id' => $actor->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
        ], [
            'branch_id' => $branch?->id,
            'description' => $description,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'ZaminNegar Demo Seeder',
        ]);
    }
}
