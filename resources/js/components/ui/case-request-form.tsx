import * as React from 'react';
import { ArrowLeft, CheckCircle2, Fingerprint, LoaderCircle, MessageSquareText, Phone, UserRound } from 'lucide-react';
import { submitPublicCaseRequest, CaseRequestSubmitError } from '../../api/caseRequests';
import {
  initialCaseRequestValues,
  validateCaseRequest,
  type CaseRequestField,
  type CaseRequestErrors,
  type CaseRequestValues,
} from '../../lib/caseRequestValidation';

type InputProps = {
  field: CaseRequestField;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  value: string;
  error?: string;
  onChange: (field: CaseRequestField, nextValue: string) => void;
  onBlur: (field: CaseRequestField) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
};

function FormInput({ field, label, placeholder, icon: Icon, value, error, onChange, onBlur, inputMode, maxLength, autoComplete, dir }: InputProps) {
  const inputId = `zcr-${field}`;
  return (
    <div className="zcr-field">
      <label htmlFor={inputId} className="zcr-label">{label} <span aria-hidden="true" className="zcr-required">*</span></label>
      <div className={`zcr-input-wrap${error ? ' zcr-input-wrap--error' : ''}`}>
        <Icon size={18} aria-hidden={true} />
        <input
          id={inputId}
          name={field}
          value={value}
          required
          type={field === 'mobile' ? 'tel' : 'text'}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          dir={dir || 'rtl'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          onBlur={() => onBlur(field)}
        />
      </div>
      {error && <p id={`${inputId}-error`} className="zcr-error">{error}</p>}
    </div>
  );
}

export default function CaseRequestForm() {
  const [values, setValues] = React.useState<CaseRequestValues>({ ...initialCaseRequestValues });
  const [errors, setErrors] = React.useState<CaseRequestErrors>({});
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const isMounted = React.useRef(false);
  React.useEffect(() => {
    // In React StrictMode, effects mount/clean up/mount in development.
    // Mark each new setup as mounted so async responses update the UI correctly.
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const onChange = (field: CaseRequestField, nextValue: string) => {
    setValues((previous) => ({ ...previous, [field]: nextValue }));
    setErrors((previous) => previous[field] ? { ...previous, [field]: undefined } : previous);
    if (status) setStatus(null);
  };

  const onBlur = (field: CaseRequestField) => {
    // خطا فقط پس از ورود مقدار نمایش داده شود، نه برای فیلد خالی در اولین بازدید.
    if (!values[field].trim()) return;
    const nextError = validateCaseRequest(values)[field];
    setErrors((previous) => ({ ...previous, [field]: nextError }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const validationErrors = validateCaseRequest(values);
    setErrors(validationErrors);
    setStatus(null);
    const firstInvalidField = (Object.keys(validationErrors) as CaseRequestField[])[0];
    if (firstInvalidField) {
      document.getElementById(`zcr-${firstInvalidField}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitPublicCaseRequest(values);
      if (!isMounted.current) return;
      setValues({ ...initialCaseRequestValues });
      setErrors({});
      setStatus({
        type: 'success',
        text: result.request_id
          ? `درخواست شما با شماره پیگیری ${result.request_id} ثبت شد. برای هماهنگی با شما تماس گرفته می‌شود.`
          : 'درخواست شما با موفقیت ثبت شد. کارشناسان برای هماهنگی با شما تماس می‌گیرند.',
      });
    } catch (error) {
      if (!isMounted.current) return;
      setStatus({
        type: 'error',
        text: error instanceof CaseRequestSubmitError
          ? error.message
          : 'ارسال درخواست انجام نشد. لطفاً دوباره تلاش کنید.',
      });
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <div className="zcr-form-card" dir="rtl">
      <div className="zcr-form-heading">
        <span className="zcr-form-icon"><Fingerprint size={20} aria-hidden="true" /></span>
        <div>
          <h3 className="zcr-form-title">فرم درخواست تشکیل پرونده</h3>
          <p className="zcr-form-hint">تکمیل این فرم کمتر از دو دقیقه زمان می‌برد.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate aria-busy={submitting} className="zcr-form">
        <FormInput
          field="fullName" label="نام و نام خانوادگی" placeholder="نام و نام خانوادگی شما"
          icon={UserRound} value={values.fullName} error={errors.fullName}
          onChange={onChange} onBlur={onBlur} maxLength={120} autoComplete="name"
        />
        <div className="zcr-form-pair">
          <FormInput
            field="nationalId" label="کد ملی" placeholder="کد ملی ۱۰ رقمی"
            icon={Fingerprint} value={values.nationalId} error={errors.nationalId}
            onChange={onChange} onBlur={onBlur} inputMode="numeric" maxLength={12} autoComplete="off" dir="ltr"
          />
          <FormInput
            field="mobile" label="شماره تماس" placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            icon={Phone} value={values.mobile} error={errors.mobile}
            onChange={onChange} onBlur={onBlur} inputMode="tel" maxLength={18} autoComplete="tel" dir="ltr"
          />
        </div>
        <div className="zcr-field">
          <label htmlFor="zcr-description" className="zcr-label">توضیحات <span className="zcr-optional">(اختیاری)</span></label>
          <div className={`zcr-input-wrap zcr-textarea-wrap${errors.description ? ' zcr-input-wrap--error' : ''}`}>
            <MessageSquareText size={18} aria-hidden="true" />
            <textarea
              id="zcr-description" name="description" value={values.description}
              placeholder="مثلاً موقعیت ملک، نوع خدمات موردنیاز یا اطلاعات اولیه پرونده..."
              rows={3} maxLength={1500}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? 'zcr-description-error' : undefined}
              onChange={(event) => onChange('description', event.target.value)}
              onBlur={() => onBlur('description')}
            />
          </div>
          {errors.description && <p className="zcr-error" id="zcr-description-error">{errors.description}</p>}
        </div>

        <button type="submit" disabled={submitting} className="zcr-submit">
          {submitting ? <LoaderCircle size={18} className="zcr-spin" aria-hidden="true" /> : <ArrowLeft size={18} aria-hidden="true" />}
          {submitting ? 'در حال ارسال درخواست...' : 'ثبت درخواست تشکیل پرونده'}
        </button>
        {status && (
          <p role={status.type === 'error' ? 'alert' : 'status'} className={`zcr-feedback zcr-feedback--${status.type}`}>
            {status.type === 'success' && <CheckCircle2 size={17} aria-hidden="true" />}
            {status.text}
          </p>
        )}
        <p className="zcr-privacy">اطلاعات واردشده برای بررسی همین درخواست به سامانه شرکت ارسال می‌شود؛ ثبت فرم به معنی تشکیل قطعی پرونده نیست.</p>
      </form>
    </div>
  );
}
