<?php

namespace Database\Seeders;

use App\Models\DailyMessage;
use Illuminate\Database\Seeder;

class DailyMessageSeeder extends Seeder
{
    public function run(): void
    {
        $messages = [
            ['content' => 'کار امروز را با دقت آغاز کن؛ نتیجه‌های بزرگ از کارهای کوچک ساخته می‌شوند.', 'author' => null],
            ['content' => 'موفقیت حاصل تداوم، نظم و توجه به جزئیات است.', 'author' => null],
            ['content' => 'هر روز فرصتی تازه برای یادگیری و بهتر انجام دادن کارهاست.', 'author' => null],
            ['content' => 'دقت در ثبت اطلاعات، پایه اعتماد به تصمیم‌های آینده است.', 'author' => null],
            ['content' => 'همکاری و مسئولیت‌پذیری، مسیر پیشرفت یک تیم را هموار می‌کند.', 'author' => null],
        ];
        foreach ($messages as $index => $message) {
            DailyMessage::firstOrCreate(['content' => $message['content']], [
                'type' => 'quote', 'author' => $message['author'], 'sort_order' => $index, 'is_active' => true,
            ]);
        }
    }
}
