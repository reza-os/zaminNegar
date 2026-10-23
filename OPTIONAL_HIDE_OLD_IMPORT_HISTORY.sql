-- اختیاری؛ پیشنهاد نمی‌شود اگر قصد حفظ گروه‌های اکسل و اشتراک‌گذاری آنها را دارید.
-- این دستور فقط بارگذاری‌های قدیمی را نرم‌حذف می‌کند؛ پرونده‌های موجود دست‌نخورده می‌مانند.
-- فایل‌ها از دیسک پاک نمی‌شوند؛ شماره پرونده‌های قدیمی نیز آزاد نمی‌شوند.
-- اگر همه گروه‌ها باید برای همیشه قابل مشاهده باشند، این دستور را اجرا نکنید.
-- پس از تهیه بکاپ و اطمینان، علامت -- ابتدای UPDATE را بردارید.

SELECT COUNT(*) AS old_batches FROM import_batches WHERE deleted_at IS NULL;
SELECT COUNT(*) AS linked_cases FROM survey_cases WHERE import_batch_id IS NOT NULL AND deleted_at IS NULL;

-- UPDATE import_batches SET deleted_at = NOW(), updated_at = NOW() WHERE deleted_at IS NULL;

-- بازیابی گروه‌های نرم‌حذف‌شده فقط با مشخص‌بودن شناسه‌های درست از روی بکاپ انجام شود؛
-- اجرای UPDATE عمومی برای بازگردانی همه گروه‌ها ممکن است گروه‌هایی را که واقعاً حذف شده‌اند نیز برگرداند.
