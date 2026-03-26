import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { syncToSisterApp, mapRoleToSisterApp } from '@/lib/sync';

const accountSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'employee']),
  employeeNumber: z.string().min(1),
  name: z.string().min(1),
  department: z.string().min(1),
  position: z.string().min(1),
  grade: z.string().min(1),
});

const bulkSchema = z.object({
  accounts: z.array(accountSchema).min(1).max(500),
  defaultPassword: z.string().min(6),
});

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'バリデーションエラー', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { accounts, defaultPassword } = parsed.data;

  // Hash once since all accounts share the same password
  const passwordHash = await hashPassword(defaultPassword);

  let created = 0;
  let skipped = 0;
  const errors: { email: string; error: string }[] = [];

  for (const account of accounts) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: account.email } });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: account.email,
            passwordHash,
            role: account.role,
            mustChangePassword: true,
          },
        });

        // Check if employee with this number already exists
        const existingEmployee = await tx.employee.findUnique({
          where: { employeeNumber: account.employeeNumber },
        });

        if (existingEmployee) {
          if (existingEmployee.userId) {
            throw new Error(`社員番号 ${account.employeeNumber} は既に別のアカウントに紐付けられています`);
          }
          // Link and update existing unlinked employee
          await tx.employee.update({
            where: { id: existingEmployee.id },
            data: {
              name: account.name,
              department: account.department,
              position: account.position,
              grade: account.grade,
              email: account.email,
              userId: newUser.id,
            },
          });
        } else {
          await tx.employee.create({
            data: {
              employeeNumber: account.employeeNumber,
              name: account.name,
              department: account.department,
              position: account.position,
              grade: account.grade,
              email: account.email,
              userId: newUser.id,
            },
          });
        }
      });

      created++;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ email: account.email, error: message });
    }
  }

  // 作成されたアカウントを相手アプリに同期（fire-and-forget）
  for (const account of accounts) {
    syncToSisterApp({
      action: "create",
      email: account.email,
      name: account.name,
      passwordHash,
      role: mapRoleToSisterApp(account.role),
    });
  }

  return NextResponse.json({ created, skipped, errors });
}
