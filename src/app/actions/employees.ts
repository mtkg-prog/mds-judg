'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const employeeSchema = z.object({
  employeeNumber: z.string().min(1, '社員番号を入力してください'),
  name: z.string().min(1, '氏名を入力してください'),
  department: z.string().min(1, '部署を入力してください'),
  position: z.string().min(1, '役職を選択してください'),
  grade: z.string().min(1, '等級を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  managerId: z.string().optional(),
});

export interface EmployeeFormState {
  error?: string;
}

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function createEmployee(
  _prevState: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireAdmin();

  const parsed = employeeSchema.safeParse({
    employeeNumber: formData.get('employeeNumber'),
    name: formData.get('name'),
    department: formData.get('department'),
    position: formData.get('position'),
    grade: formData.get('grade'),
    email: formData.get('email'),
    managerId: formData.get('managerId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.employee.create({ data: parsed.data });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { error: '社員番号またはメールアドレスが既に使用されています' };
    }
    return { error: '社員の作成に失敗しました' };
  }

  revalidatePath('/admin/employees');
  redirect('/admin/employees');
}

export async function updateEmployee(
  _prevState: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireAdmin();

  const id = formData.get('id') as string;
  const parsed = employeeSchema.safeParse({
    employeeNumber: formData.get('employeeNumber'),
    name: formData.get('name'),
    department: formData.get('department'),
    position: formData.get('position'),
    grade: formData.get('grade'),
    email: formData.get('email'),
    managerId: formData.get('managerId') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await prisma.employee.update({
      where: { id },
      data: parsed.data,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique constraint')) {
      return { error: '社員番号またはメールアドレスが既に使用されています' };
    }
    return { error: '社員の更新に失敗しました' };
  }

  revalidatePath('/admin/employees');
  redirect('/admin/employees');
}

export async function deleteEmployee(id: string): Promise<void> {
  await requireAdmin();
  await prisma.employee.delete({ where: { id } });
  revalidatePath('/admin/employees');
}
