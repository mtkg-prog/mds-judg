import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { syncToSisterApp, mapRoleToSisterApp } from '@/lib/sync';

const accountSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'employee']),
  employeeNumber: z.string().optional(),
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

      const newUser = await prisma.user.create({
        data: {
          email: account.email,
          passwordHash,
          role: account.role,
          mustChangePassword: true,
        },
      });

      if (account.employeeNumber) {
        try {
          await prisma.employee.update({
            where: { employeeNumber: account.employeeNumber },
            data: { userId: newUser.id },
          });
        } catch {
          // Employee not found - user created but not linked
          errors.push({
            email: account.email,
            error: `社員番号 ${account.employeeNumber} が見つかりません（アカウントは作成済み）`,
          });
        }
      }

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
      name: account.email.split("@")[0],
      passwordHash,
      role: mapRoleToSisterApp(account.role),
    });
  }

  return NextResponse.json({ created, skipped, errors });
}
