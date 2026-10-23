export type AnalyticsScope = 'all' | 'employee' | 'branch';
export type Summary = {
  total_cases: number;
  created_today: number;
  created_month: number;
  due_followups: number;
  import_batches: number;
  imported_rows: number;
  activities: number;
  case_actions: number;
  employees: number;
  branches: number;
};
export type Breakdown = { id: number | string; label: string; color?: string | null; count: number };
export type StatusGroup = { key: string; label: string; total: number; items: Breakdown[] };
export type Analytics = {
  scope: AnalyticsScope;
  subject: null | {
    id: number; name: string; username?: string; email?: string; mobile?: string | null;
    role?: string; branch_name?: string | null; branch_id?: number | null;
    city?: string | null; code?: string | null; address?: string | null;
    is_active?: boolean; last_login_at?: string | null; created_at?: string;
  };
  summary: Summary;
  weekly: { date: string; count: number }[];
  radar: { label: string; value: number }[];
  status_groups: StatusGroup[];
  recent_cases: { id: number; case_number: string | null; owner_full_name: string; created_at: string; status?: { title: string } | null }[];
  recent_activities: { id: number; action: string; description: string | null; created_at: string; user?: { name: string } | null }[];
};
export type Option = { id: number; name: string; username?: string; code?: string | null; city?: string | null; branch?: { name: string } | null; is_active: boolean };
export type OptionResponse = { data: Option[]; current_page: number; last_page: number; total: number };
export const fmt = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
export const dateFa = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date);
};
export const dateTimeFa = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
