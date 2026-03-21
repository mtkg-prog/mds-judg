import { getSession } from './auth';
import type { AuthUser, UserRole } from './types';

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) {
    throw new Response(JSON.stringify({ error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'アクセス権限がありません' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}
