'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, deleteSession, verifyPassword } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: 'メールアドレスまたはパスワードが正しくありません' };
  }

  await createSession(user.id, user.role as UserRole, user.mustChangePassword);
  redirect(user.mustChangePassword ? '/change-password' : '/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
