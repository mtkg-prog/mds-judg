import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import type { SessionPayload, AuthUser, UserRole } from './types';

const SESSION_COOKIE = 'session';
const SESSION_EXPIRY_HOURS = 24;

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

export async function createSession(userId: string, role: UserRole): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const payload: SessionPayload = {
    sessionId: session.id,
    userId,
    role,
  };

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSession(): Promise<AuthUser | null> {
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
      employeeId: session.user.employee?.id,
      employeeName: session.user.employee?.name,
    };
  } catch {
    return null;
  }
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
