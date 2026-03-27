import { getSession } from './auth';
import { getCarrierSession } from '@/lib/carrier-auth';
import { prisma } from './prisma';
import type { AuthUser, UserRole } from './types';

const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'legacy';

async function getAuthUser(): Promise<AuthUser | null> {
  if (AUTH_PROVIDER === 'carrier') {
    const carrier = await getCarrierSession();
    if (!carrier) return null;

    // Look up the local User record by email to get app-specific role
    const user = await prisma.user.findUnique({
      where: { email: carrier.email },
      include: { employee: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      mustChangePassword: false, // CarrierAuth doesn't use password change flow
      employeeId: user.employee?.id,
      employeeName: user.employee?.name,
    };
  }

  // legacy: use existing JWT-based session
  return getSession();
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
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
