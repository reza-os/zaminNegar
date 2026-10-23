import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Loader2, Trash2, X } from 'lucide-react';
import './case-actions-dialog.css';

export type CaseActionItem = {
  id: number;
  case_number: string;
  owner_full_name: string;
  village_name?: string | null;
  status?: { title: string; color: string } | null;
};

type CaseActionsDialogProps = {
  item: CaseActionItem;
  canDelete: boolean;
  isDeleting: boolean;
  error: string;
  onDelete: () => void;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
};

export default function CaseActionsDialog({
  item,
  canDelete,
  isDeleting,
  error,
  onDelete,
  onClose,
  returnFocusTo,
}: CaseActionsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(isDeleting);
  deletingRef.current = isDeleting;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!deletingRef.current) onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const nextFocus = returnFocusTo?.isConnected ? returnFocusTo : previousFocus;
      if (nextFocus?.isConnected) nextFocus.focus();
    };
  }, [onClose, returnFocusTo]);

  return (
    <div
      className="employee-actions-backdrop fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      onMouseDown={(event) => { if (!isDeleting && event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-case-actions-title"
        aria-describedby="employee-case-actions-description"
        tabIndex={-1}
        className="employee-actions-dialog relative w-full max-w-md p-6 sm:p-7"
        dir="rtl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="employee-actions-close absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-2xl"
          aria-label="بستن پنجره"
        >
          <X size={19} aria-hidden="true" />
        </button>

        <span className="employee-badge-soft">عملیات پرونده</span>
        <h2 id="employee-case-actions-title" className="mt-5 pl-12 text-xl font-black text-[var(--ew-text)]">
          {item.owner_full_name}
        </h2>
        <p id="employee-case-actions-description" className="mt-3 text-sm leading-7 text-[var(--ew-muted)]">
          شماره پرونده: <b className="text-[var(--ew-text)]" dir="auto">{item.case_number}</b>
          {item.village_name ? <> · روستا: {item.village_name}</> : null}
        </p>
        <div className="employee-mini-card mt-5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-[var(--ew-muted)]">وضعیت پرونده</span>
          <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: item.status?.color || '#986b51' }}>
            {item.status?.title || 'نامشخص'}
          </span>
        </div>

        {error && <div role="alert" className="employee-alert mt-4">{error}</div>}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to={`/employee/cases/${item.id}/edit`} className="employee-button min-h-12">
            <Edit3 size={17} aria-hidden="true" /> ویرایش پرونده
          </Link>
          {canDelete && (
            <button type="button" onClick={onDelete} disabled={isDeleting} className="employee-danger-button min-h-12">
              {isDeleting ? <Loader2 className="animate-spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
              {isDeleting ? 'در حال حذف...' : 'حذف پرونده'}
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs leading-6 text-[var(--ew-muted)]">
          حذف پرونده فقط پس از تأیید شما انجام می‌شود.
        </p>
      </div>
    </div>
  );
}
