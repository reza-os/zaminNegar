-- زمین‌نگار: نمونه انتقال داده موجود بدون تغییر ثبت‌کننده اصلی.
-- این فایل را با دقت و فقط پس از بکاپ کامل دیتابیس استفاده کنید.
-- قبل از اجرا، به جای 999 شناسه واقعی شعبه منتخب را وارد کنید.
-- تمام رکوردهای فاقد شعبه به آن شعبه منتقل می‌شوند؛ اگر داده‌ها متعلق به چند شعبه‌اند، این SQL را یکجا اجرا نکنید.

-- ۱) بررسی (صرفاً خواندن)
SELECT id, name, deleted_at FROM branches ORDER BY id;
SELECT id, name, role, branch_id, deleted_at FROM users WHERE role IN ('employee','surveyor') ORDER BY id;
SELECT COUNT(*) AS cases_without_branch FROM survey_cases WHERE branch_id IS NULL AND deleted_at IS NULL;
SELECT COUNT(*) AS batches_without_branch FROM import_batches WHERE branch_id IS NULL AND deleted_at IS NULL;

-- ۲) برای انتقال به یک شعبه مشخص، 999 را جایگزین کنید و سپس خطوط زیر را بدون -- اجرا کنید.
-- START TRANSACTION;
-- UPDATE import_batches SET branch_id = 999 WHERE branch_id IS NULL AND deleted_at IS NULL;
-- UPDATE survey_cases AS c
-- LEFT JOIN import_batches AS b ON b.id = c.import_batch_id
-- SET c.branch_id = COALESCE(b.branch_id, 999)
-- WHERE c.branch_id IS NULL AND c.deleted_at IS NULL;
-- COMMIT;

-- عمداً created_by، user_id و import_batch_id را تغییر نمی‌دهیم.
-- سپس از /manager/data-access به کارکن جدید همان شعبه مجوز مشاهده یا ویرایش بدهید.
