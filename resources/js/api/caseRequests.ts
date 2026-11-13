import { caseRequestSettings } from '../config/caseRequest';
import { normalizedCaseRequest, type CaseRequestValues } from '../lib/caseRequestValidation';

/** قرارداد پاسخ API: { success: true, request_id?: number }. */
export type CaseRequestResponse = { success: true; request_id?: number | string };

export class CaseRequestSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaseRequestSubmitError';
  }
}

export async function submitPublicCaseRequest(values: CaseRequestValues): Promise<CaseRequestResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), caseRequestSettings.requestTimeoutMs);
  try {
    // این فراخوانی عمداً از interceptor عمومی api/client.ts استفاده نمی‌کند؛
    // درخواست عمومی نباید توکن کارمندان را بفرستد یا باعث خروج از داشبورد شود.
    const response = await fetch(caseRequestSettings.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(normalizedCaseRequest(values)),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new CaseRequestSubmitError('تعداد درخواست‌ها زیاد شده است. چند دقیقه دیگر دوباره تلاش کنید.');
    }
    if (response.status === 422) {
      throw new CaseRequestSubmitError('اطلاعات واردشده تأیید نشد. لطفاً فیلدها را بررسی کنید.');
    }
    if (!response.ok) {
      throw new CaseRequestSubmitError('ارسال درخواست ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new CaseRequestSubmitError('پاسخ سامانه ثبت درخواست معتبر نیست. اتصال سرور را بررسی کنید.');
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('success' in result) || result.success !== true) {
      throw new CaseRequestSubmitError('ثبت درخواست از سوی سرور تأیید نشد. لطفاً دوباره تلاش کنید.');
    }
    const obj = result as Record<string, unknown>;
    return {
      success: true,
      request_id: typeof obj.request_id === 'number' || typeof obj.request_id === 'string'
        ? obj.request_id : undefined,
    };
  } catch (error) {
    if (error instanceof CaseRequestSubmitError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CaseRequestSubmitError('زمان اتصال به سرور به پایان رسید. دوباره تلاش کنید.');
    }
    throw new CaseRequestSubmitError('ارتباط با سامانه برقرار نشد؛ لطفاً اتصال اینترنت یا آدرس API را بررسی کنید.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export type PublicOffice = { id: number; name: string; city: string | null };

/** Public office list is intentionally independent of staff authentication. */
export async function fetchPublicOffices(signal?: AbortSignal): Promise<PublicOffice[]> {
  const response = await fetch('/api/public/branches', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('دریافت دفترهای شرکت امکان‌پذیر نیست.');
  const result = await response.json() as { data?: PublicOffice[] };
  if (!Array.isArray(result.data)) throw new Error('اطلاعات دفترها معتبر نیست.');
  return result.data;
}

export type TrackingResult = { tracking_code: string; status: string; created_at: string };
export async function trackPublicCaseRequest(code: string, phone: string): Promise<TrackingResult> {
  const response = await fetch('/api/public/case-requests/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ tracking_code: code.trim().toUpperCase(), mobile: normalizePhoneForTracking(phone) }),
  });
  if (response.status === 429) throw new CaseRequestSubmitError('تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.');
  if (response.status === 404) throw new CaseRequestSubmitError('درخواستی با این کد و شماره همراه پیدا نشد.');
  if (!response.ok) throw new CaseRequestSubmitError('پیگیری درخواست ممکن نشد.');
  const result = await response.json() as { data: TrackingResult };
  return result.data;
}
function normalizePhoneForTracking(input: string): string {
  return input.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s\-()]/g, '');
}
