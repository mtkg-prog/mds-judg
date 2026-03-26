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
  employeeNumber: z.string().min(1, '社員番号を入力してください'),
  name: z.string().min(1, '氏名を入力してください'),
  department: z.string().min(1, '部署を入力してください'),
  position: z.string().min(1, '役職を選択してください'),
  grade: z.string().min(1, '等級を入力してください'),
  managerId: z.string().optional(),
});

const updateAccountSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  role: z.enum(['admin', 'manager', 'employee']),
  employeeNumber: z.string().min(1, '社員番号を入力してください'),
  name: z.string().min(1, '氏名を入力してください'),
  department: z.string().min(1, '部署を入力してください'),
  position: z.string().min(1, '役職を選択してください'),
  grade: z.string().min(1, '等級を入力してください'),
  managerId: z.string().optional(),
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
    employeeNumber: formData.get('employeeNumber'),
    name: formData.get('name'),
    department: formData.get('department'),
    position: formData.get('position'),
    grade: formData.get('grade'),
    managerId: formData.get('managerId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, role, employeeNumber, name, department, position, grade, managerId } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, role },
      });

      // Check if employee with this number already exists
      const existingEmployee = await tx.employee.findUnique({
        where: { employeeNumber },
      });

      if (existingEmployee) {
        if (existingEmployee.userId) {
          throw new Error('EMPLOYEE_LINKED');
        }
        // Link and update existing unlinked employee
        await tx.employee.update({
          where: { id: existingEmployee.id },
          data: { name, department, position, grade, email, managerId: managerId || null, userId: newUser.id },
        });
      } else {
        await tx.employee.create({
          data: { employeeNumber, name, department, position, grade, email, managerId: managerId || null, userId: newUser.id },
        });
      }
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'EMPLOYEE_LINKED') {
        return { error: 'この社員番号は既に別のアカウントに紐付けられています' };
      }
      if (e.message.includes('Unique constraint')) {
        if (e.message.includes('email')) {
          return { error: 'このメールアドレスは既に使用されています' };
        }
        if (e.message.includes('employeeNumber')) {
          return { error: 'この社員番号は既に使用されています' };
        }
        return { error: 'メールアドレスまたは社員番号が重複しています' };
      }
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
    employeeNumber: formData.get('employeeNumber'),
    name: formData.get('name'),
    department: formData.get('department'),
    position: formData.get('position'),
    grade: formData.get('grade'),
    managerId: formData.get('managerId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, role, employeeNumber, name, department, position, grade, managerId } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { email, role },
      });

      // Check if user already has a linked employee
      const linkedEmployee = await tx.employee.findUnique({
        where: { userId: id },
      });

      if (linkedEmployee) {
        // Check employeeNumber conflict if changed
        if (linkedEmployee.employeeNumber !== employeeNumber) {
          const conflict = await tx.employee.findUnique({ where: { employeeNumber } });
          if (conflict) {
            throw new Error('EMPLOYEE_NUMBER_CONFLICT');
          }
        }
        // Update linked employee
        await tx.employee.update({
          where: { id: linkedEmployee.id },
          data: { employeeNumber, name, department, position, grade, email, managerId: managerId || null },
        });
      } else {
        // No linked employee — create or link
        const existingEmployee = await tx.employee.findUnique({ where: { employeeNumber } });
        if (existingEmployee) {
          if (existingEmployee.userId) {
            throw new Error('EMPLOYEE_LINKED');
          }
          await tx.employee.update({
            where: { id: existingEmployee.id },
            data: { name, department, position, grade, email, managerId: managerId || null, userId: id },
          });
        } else {
          await tx.employee.create({
            data: { employeeNumber, name, department, position, grade, email, managerId: managerId || null, userId: id },
          });
        }
      }
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'EMPLOYEE_LINKED') {
        return { error: 'この社員番号は既に別のアカウントに紐付けられています' };
      }
      if (e.message === 'EMPLOYEE_NUMBER_CONFLICT') {
        return { error: 'この社員番号は既に使用されています' };
      }
      if (e.message.includes('Unique constraint')) {
        return { error: 'メールアドレスまたは社員番号が重複しています' };
      }
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
