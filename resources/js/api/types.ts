export type LookupItem = {
  id: number;
  group_key: string;
  title: string;
  color?: string | null;
};

export type SurveyCase = {
  id: number;
  case_number?: string;
  owner_full_name: string;
  national_code?: string;
  phone?: string;
  village_name?: string;
  case_date?: string;
  status?: LookupItem | null;
  stage?: LookupItem | null;
  priority?: LookupItem | null;
  assigned_user?: { id: number; name: string } | null;
  surveyor?: { id: number; name: string } | null;
  next_action?: string | null;
  next_action_at?: string | null;
  remaining_amount?: string;
  days_without_action?: number | null;
};
