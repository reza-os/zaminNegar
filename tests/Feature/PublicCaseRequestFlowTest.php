<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\PublicCaseRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicCaseRequestFlowTest extends TestCase
{
    use RefreshDatabase;

    private Branch $first;
    private Branch $second;
    private User $workerA;
    private User $workerB;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = User::create([
            'name' => 'Manager', 'email' => 'requests-manager@local.test',
            'password' => 'test-secret', 'role' => 'manager', 'is_active' => true,
        ]);
        $this->first = Branch::create(['name' => 'Tehran', 'code' => 'REQ-01', 'manager_id' => $this->manager->id, 'is_active' => true]);
        $this->second = Branch::create(['name' => 'Karaj', 'code' => 'REQ-02', 'manager_id' => $this->manager->id, 'is_active' => true]);
        $this->workerA = User::create([
            'name' => 'Worker A', 'email' => 'requests-a@local.test', 'password' => 'test-secret',
            'role' => 'employee', 'branch_id' => $this->first->id, 'is_active' => true,
        ]);
        $this->workerB = User::create([
            'name' => 'Worker B', 'email' => 'requests-b@local.test', 'password' => 'test-secret',
            'role' => 'surveyor', 'branch_id' => $this->second->id, 'is_active' => true,
        ]);
    }

    private function payload(int $branchId): array
    {
        // Iranian national ID with a valid mod-11 checksum.
        return ['branch_id' => $branchId, 'full_name' => 'محمد رضایی',
            'national_id' => '0084575948', 'mobile' => '۰۹۱۲۱۲۳۴۵۶۷', 'description' => 'برداشت زمین کشاورزی'];
    }

    public function test_public_sees_only_active_branches(): void
    {
        $this->second->update(['is_active' => false]);
        $this->getJson('/api/public/branches')->assertOk()
            ->assertJsonFragment(['name' => 'Tehran'])->assertJsonMissing(['name' => 'Karaj']);
    }

    public function test_public_request_is_stored_for_selected_office_and_encrypted_at_rest(): void
    {
        $response = $this->postJson('/api/public/case-requests', $this->payload($this->first->id))
            ->assertCreated()->assertJsonPath('success', true);
        $record = PublicCaseRequest::firstOrFail();
        $this->assertSame($this->first->id, $record->branch_id);
        $this->assertSame('09121234567', $record->mobile);
        $this->assertSame('0084575948', $record->national_id);
        $this->assertNotSame('0084575948', DB::table('public_case_requests')->value('national_id'));
        $this->assertSame($record->tracking_code, $response->json('request_id'));
    }

    public function test_inactive_or_deleted_office_is_rejected(): void
    {
        $this->second->update(['is_active' => false]);
        $this->postJson('/api/public/case-requests', $this->payload($this->second->id))
            ->assertUnprocessable()->assertJsonValidationErrors('branch_id');
        $this->second->update(['is_active' => true]);
        $this->second->delete();
        $this->postJson('/api/public/case-requests', $this->payload($this->second->id))
            ->assertUnprocessable()->assertJsonValidationErrors('branch_id');
    }

    public function test_staff_only_see_requests_addressed_to_their_office(): void
    {
        $a = $this->postJson('/api/public/case-requests', $this->payload($this->first->id))->json('request_id');
        $b = $this->postJson('/api/public/case-requests', $this->payload($this->second->id))->json('request_id');
        $recordB = PublicCaseRequest::where('tracking_code', $b)->firstOrFail();
        $this->actingAs($this->workerA, 'sanctum');
        $this->getJson('/api/case-requests')->assertOk()->assertJsonFragment(['tracking_code' => $a])
            ->assertJsonMissing(['tracking_code' => $b]);
        $this->getJson('/api/case-requests/'.$recordB->id)->assertNotFound();
        $this->patchJson('/api/case-requests/'.$recordB->id, ['status' => 'accepted'])->assertNotFound();
    }

    public function test_staff_can_change_status_and_public_can_track_without_personal_data(): void
    {
        $this->postJson('/api/public/case-requests', $this->payload($this->first->id))->assertCreated();
        $record = PublicCaseRequest::firstOrFail();
        $this->actingAs($this->workerA, 'sanctum')
            ->patchJson('/api/case-requests/'.$record->id, ['status' => 'in_review', 'internal_note' => 'برای تماس پیگیری شود'])
            ->assertOk()->assertJsonPath('data.status', 'in_review');
        $this->assertDatabaseHas('activity_logs', ['action' => 'public_case_request_updated', 'subject_id' => $record->id]);
        // Unauthenticated tracking accepts only code + original mobile and returns no ID number or staff notes.
        auth('sanctum')->forgetUser();
        $response = $this->postJson('/api/public/case-requests/track', [
            'tracking_code' => $record->tracking_code, 'mobile' => '09121234567',
        ])->assertOk()->assertJsonPath('data.status', 'in_review');
        $this->assertArrayNotHasKey('national_id', $response->json('data'));
        $this->assertArrayNotHasKey('internal_note', $response->json('data'));
    }

    public function test_manager_can_view_all_offices(): void
    {
        $this->postJson('/api/public/case-requests', $this->payload($this->first->id))->assertCreated();
        $this->postJson('/api/public/case-requests', $this->payload($this->second->id))->assertCreated();
        $this->actingAs($this->manager, 'sanctum')
            ->getJson('/api/case-requests')->assertOk()->assertJsonCount(2, 'data');
    }
}
