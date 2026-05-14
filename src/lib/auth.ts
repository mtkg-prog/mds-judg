import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { SessionPayload, AuthUser, UserRole } from './types';

const SESSION_COOKIE = 'session';
const SESSION_EXPIRY_HOURS = 24;
const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'legacy';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * セッショントークン作成（Cookie設定なし — Route Handler用）
 * Session DBレコード作成 + JWT署名 → { token, expiresAt } を返す
 */
export async function createSessionToken(
  userId: string, role: UserRole, mustChangePassword = false
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const payload: SessionPayload = {
    sessionId: session.id,
    userId,
    role,
    mustChangePassword,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());

  return { token, expiresAt };
}

export async function createSession(userId: string, role: UserRole, mustChangePassword = false): Promise<void> {
  const { token, expiresAt } = await createSessionToken(userId, role, mustChangePassword);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Get current session. Supports both legacy JWT and CarrierAuth.
 */
export async function getSession(): Promise<AuthUser | null> {
  if (AUTH_PROVIDER === 'carrier') {
    return getCarrierSessionAsAuthUser();
  }
  return getLegacySession();
}

/**
 * CarrierAuth session: verify carrier_session cookie, look up or create local User + Employee
 */
async function getCarrierSessionAsAuthUser(): Promise<AuthUser | null> {
  const { getCarrierSession } = await import('@/lib/carrier-auth');
  const carrier = await getCarrierSession();
  if (!carrier) return null;

  let user = await prisma.user.findUnique({
    where: { email: carrier.email },
    include: { employee: true },
  });

  if (!user) {
    // ローカルUserが未登録 → 自動作成（User + Employee）
    const roleMap: Record<string, string> = { admin: 'admin', user: 'employee' };
    user = await prisma.user.create({
      data: {
        email: carrier.email,
        passwordHash: '',
        role: roleMap[carrier.role] || 'employee',
        mustChangePassword: false,
        employee: {
          create: {
            employeeNumber: carrier.email.split('@')[0],
            name: carrier.name || carrier.email.split('@')[0],
            email: carrier.email,
            department: carrier.departmentName || '',
            position: carrier.position || '',
            grade: '',
          },
        },
      },
      include: { employee: true },
    });
  } else if (user.employee) {
    // ローカルEmployeeが存在 → CareerAuthの情報で同期更新
    const updates: Record<string, string> = {};
    if (carrier.name && carrier.name !== user.employee.name) updates.name = carrier.name;
    if (carrier.departmentName && carrier.departmentName !== user.employee.department) updates.department = carrier.departmentName;
    if (carrier.position && carrier.position !== user.employee.position) updates.position = carrier.position;

    if (Object.keys(updates).length > 0) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: updates,
      });
      // 更新後のデータを再取得
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { employee: true },
      }) || user;
    }
  } else {
    // Userはあるが Employeeがない → Employee作成
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: carrier.email.split('@')[0],
        name: carrier.name || carrier.email.split('@')[0],
        email: carrier.email,
        department: carrier.departmentName || '',
        position: carrier.position || '',
        grade: '',
        userId: user.id,
      },
    });
    user = { ...user, employee: emp };
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    mustChangePassword: false,
    employeeId: user.employee?.id,
    employeeName: user.employee?.name,
  };
}

/**
 * Legacy JWT session
 */
async function getLegacySession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const { sessionId, userId, role } = payload as unknown as SessionPayload;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { employee: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: sessionId } });
      }
      return null;
    }

    return {
      id: userId,
      email: session.user.email,
      role: role as UserRole,
      mustChangePassword: session.user.mustChangePassword,
      employeeId: session.user.employee?.id,
      employeeName: session.user.employee?.name,
    };
  } catch {
    return null;
  }
}

/**
 * Google OAuth ユーザーの find-or-create
 * メールアドレスでUserを検索し、なければUser + Employeeを自動作成
 */
export async function findOrCreateGoogleUser(
  email: string, name: string
): Promise<{ userId: string; role: UserRole }> {
  // 既存ユーザーを検索
  let user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user) {
    // 新規ユーザー → User + Employee 自動作成
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: '',
        role: 'employee',
        mustChangePassword: false,
        employee: {
          create: {
            employeeNumber: email.split('@')[0],
            name: name || email.split('@')[0],
            email,
            department: '',
            position: '',
            grade: '',
          },
        },
      },
      include: { employee: true },
    });
  } else if (user.employee && name && name !== user.employee.name) {
    // 名前が変更されていれば同期更新
    await prisma.employee.update({
      where: { id: user.employee.id },
      data: { name },
    });
  } else if (!user.employee) {
    // Userはあるが Employeeがない → Employee作成
    await prisma.employee.create({
      data: {
        employeeNumber: email.split('@')[0],
        name: name || email.split('@')[0],
        email,
        department: '',
        position: '',
        grade: '',
        userId: user.id,
      },
    });
  }

  return { userId: user.id, role: user.role as UserRole };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const { sessionId } = payload as unknown as SessionPayload;
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    } catch {
      // Invalid token, just clear cookie
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}
