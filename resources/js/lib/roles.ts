export type Role = 'admin' | 'manager' | 'employee' | 'surveyor';
export type SessionUser = {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  role: Role;
  branch_id?: number | null;
};

export const homeFor = (role?: string) =>
  role === 'admin' ? '/admin/managers' : role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';

export function cachedUser(): SessionUser | null {
  try {
    const value = localStorage.getItem('user');
    if (!value) return null;
    const user = JSON.parse(value) as SessionUser;
    return user && typeof user.role === 'string' ? user : null;
  } catch {
    return null;
  }
}

export const errorMessage = (error: unknown): string => {
  const response = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  return Object.values(response.response?.data?.errors || {})[0]?.[0]
    || response.response?.data?.message || 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.';
};
