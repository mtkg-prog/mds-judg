'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, createSession, deleteSession } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'パスワードは6文字以上にしてください'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export interface ChangePasswordState {
  error?: string;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { newPassword } = parsed.data;
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // Recreate session with mustChangePassword=false so proxy allows navigation
  await deleteSession();
  await createSession(user.id, user.role as UserRole, false);

  redirect('/');
}
