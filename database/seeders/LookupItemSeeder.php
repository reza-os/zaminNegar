<?php

namespace Database\Seeders;

use App\Models\LookupItem;
use Illuminate\Database\Seeder;

class LookupItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            'case_status' => [
                ['جدید', '#10b981'], ['در حال انجام', '#3b82f6'], ['منتظر اقدام', '#f59e0b'], ['تکمیل‌شده', '#8b5cf6'], ['متوقف', '#ef4444'],
            ],
            'case_stage' => [
                ['ثبت اولیه', '#64748b'], ['تکمیل مدارک', '#06b6d4'], ['پردازش نقشه', '#3b82f6'], ['ارسال به اداره', '#f59e0b'], ['تحویل پرونده', '#10b981'],
            ],
            'priority' => [
                ['فوری', '#ef4444'], ['بالا', '#f97316'], ['عادی', '#3b82f6'], ['پایین', '#64748b'],
            ],
            'followup_status' => [
                ['نیازمند پیگیری', '#ef4444'], ['پیگیری شده', '#10b981'], ['بدون پیگیری', '#64748b'],
            ],
            'stop_reason' => [
                ['نقص مدارک', '#f97316'], ['عدم پرداخت', '#ef4444'], ['در انتظار پاسخ اداره', '#f59e0b'], ['درخواست مشتری', '#64748b'],
            ],
            'financial_status' => [
                ['تسویه شده', '#10b981'], ['بدهکار', '#ef4444'], ['در انتظار پرداخت', '#f59e0b'],
            ],
            'physical_status' => [
                ['در دفتر', '#3b82f6'], ['بایگانی', '#10b981'], ['تحویل مشتری', '#8b5cf6'], ['ارسال به اداره', '#f59e0b'],
            ],
            'customer_source' => [
                ['معرفی مشتری', '#64748b'], ['تبلیغات', '#3b82f6'], ['مراجعه حضوری', '#10b981'], ['سایت', '#8b5cf6'],
            ],
        ];

        foreach ($items as $group => $rows) {
            foreach ($rows as $index => [$title, $color]) {
                LookupItem::updateOrCreate(
                    ['group_key' => $group, 'title' => $title],
                    ['color' => $color, 'sort_order' => $index + 1, 'is_active' => true]
                );
            }
        }
    }
}
