/** توابع مستقل، قابل آزمون و بدون وابستگی برای بررسی ورودی‌های فرم عمومی. */
export type CaseRequestField = 'fullName' | 'nationalId' | 'mobile' | 'description';
export type CaseRequestValues = Record<CaseRequestField, string>;
export type CaseRequestErrors = Partial<Record<CaseRequestField, string>>;

export const initialCaseRequestValues: CaseRequestValues = {
  fullName: '',
  nationalId: '',
  mobile: '',
  description: '',
};

/** ورودی فارسی/عربی اعداد را به ASCII تبدیل می‌کند (بک‌اند هم باید اعتبارسنجی کند). */
export function latinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function normalizePhone(value: string): string {
  const compact = latinDigits(value).replace(/[\s\-()]/g, '');
  if (compact.startsWith('+98')) return `0${compact.slice(3)}`;
  if (compact.startsWith('0098')) return `0${compact.slice(4)}`;
  if (compact.startsWith('98') && compact.length === 12) return `0${compact.slice(2)}`;
  return compact;
}

/** الگوریتم رقم کنترلی کد ملی ایران. */
export function validNationalId(value: string): boolean {
  const code = latinDigits(value).trim();
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const sum = code
    .slice(0, 9)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  const check = remainder < 2 ? remainder : 11 - remainder;
  return check === Number(code[9]);
}

export function validateCaseRequest(values: CaseRequestValues): CaseRequestErrors {
  const errors: CaseRequestErrors = {};
  const fullName = values.fullName.replace(/\s+/g, ' ').trim();
  const nationalId = latinDigits(values.nationalId).trim();
  const mobile = normalizePhone(values.mobile);
  const description = values.description.trim();

  if (fullName.length < 3 || fullName.length > 120) {
    errors.fullName = 'نام و نام خانوادگی را به‌درستی وارد کنید.';
  }
  if (!validNationalId(nationalId)) {
    errors.nationalId = 'کد ملی ۱۰ رقمی معتبر وارد کنید.';
  }
  if (!/^09\d{9}$/.test(mobile)) {
    errors.mobile = 'شماره موبایل معتبر، مانند ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.';
  }
  if (description.length > 1500) {
    errors.description = 'توضیحات نباید بیشتر از ۱۵۰۰ نویسه باشد.';
  }
  return errors;
}

export function normalizedCaseRequest(values: CaseRequestValues) {
  return {
    full_name: values.fullName.replace(/\s+/g, ' ').trim(),
    national_id: latinDigits(values.nationalId).trim(),
    mobile: normalizePhone(values.mobile),
    description: values.description.trim() || null,
  };
}
