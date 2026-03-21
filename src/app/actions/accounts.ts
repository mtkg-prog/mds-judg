'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

const accountSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上にしてください'),
  role: z.enum(['admin', 'manager', 'employee']),
  employeeId: z.string().optional(),
});

const updateAccountSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'manager', 'employee']),
  employeeId: z.string().optional(),
});

export interface AccountFormState {
  error?: string;
}

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function createAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireAdmin();

  const parsed = accountSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    employeeId: formData.get('employeeId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, role, employeeId } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, role },
    });

    if (employeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { userId: user.id },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { error: 'このメールアドレスは既に使用されています' };
    }
    return { error: 'アカウントの作成に失敗しました' };
  }

  revalidatePath('/admin/accounts');
  redirect('/admin/accounts');
}

export async function updateAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireAdmin();

  const id = formData.get('id') as string;
  const parsed = updateAccountSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
    employeeId: formData.get('employeeId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, role, employeeId } = parsed.data;

  try {
    await prisma.user.update({
      where: { id },
      data: { email, role },
    });

    // Unlink previous employee if any
    await prisma.employee.updateMany({
      where: { userId: id },
      data: { userId: null },
    });

    // Link new employee if specified
    if (employeeId) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { userId: id },
      });
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { error: 'このメールアドレスは既に使用されています' };
    }
    return { error: 'アカウントの更新に失敗しました' };
  }

  revalidatePath('/admin/accounts');
  redirect('/admin/accounts');
}

export async function resetPassword(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireAdmin();

  const id = formData.get('id') as string;
  const password = formData.get('password') as string;

  if (!password || password.length < 6) {
    return { error: 'パスワードは6文字以上にしてください' };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  // Invalidate all sessions for this user
  await prisma.session.deleteMany({ where: { userId: id } });

  return {};
}

export async function deleteAccount(id: string): Promise<void> {
  await requireAdmin();
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.employee.updateMany({
    where: { userId: id },
    data: { userId: null },
  });
  await prisma.user.delete({ where: { id } });
  revalidatePath('/admin/accounts');
}
