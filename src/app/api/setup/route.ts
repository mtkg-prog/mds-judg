import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const rawPrisma = new PrismaClient();

  try {
    // テーブルが存在しない場合は作成
    try {
      await rawPrisma.$executeRawUnsafe(`SELECT 1 FROM "User" LIMIT 1`);
    } catch {
      // テーブルが存在しない - 作成する
      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'employee',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);

      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Employee" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "employeeNumber" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "department" TEXT NOT NULL,
          "position" TEXT NOT NULL,
          "grade" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "userId" TEXT,
          "managerId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
          CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL
        )
      `);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Employee_employeeNumber_key" ON "Employee"("employeeNumber")`);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Employee_email_key" ON "Employee"("email")`);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId")`);

      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        )
      `);

      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EvaluationCycle" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'draft',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EvaluationAssignment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "cycleId" TEXT NOT NULL,
          "evaluatorId" TEXT NOT NULL,
          "evaluateeId" TEXT NOT NULL,
          "relationship" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EvaluationAssignment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle"("id") ON DELETE CASCADE,
          CONSTRAINT "EvaluationAssignment_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "Employee"("id") ON DELETE RESTRICT,
          CONSTRAINT "EvaluationAssignment_evaluateeId_fkey" FOREIGN KEY ("evaluateeId") REFERENCES "Employee"("id") ON DELETE RESTRICT
        )
      `);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationAssignment_cycleId_evaluatorId_evaluateeId_key" ON "EvaluationAssignment"("cycleId", "evaluatorId", "evaluateeId")`);

      await rawPrisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EvaluationResponse" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "assignmentId" TEXT NOT NULL,
          "cycleId" TEXT NOT NULL,
          "evaluateeId" TEXT NOT NULL,
          "relationship" TEXT NOT NULL,
          "scores" TEXT NOT NULL,
          "comment" TEXT NOT NULL DEFAULT '',
          "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EvaluationResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EvaluationAssignment"("id") ON DELETE CASCADE,
          CONSTRAINT "EvaluationResponse_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "EvaluationCycle"("id") ON DELETE RESTRICT
        )
      `);
      await rawPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EvaluationResponse_assignmentId_key" ON "EvaluationResponse"("assignmentId")`);
      await rawPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EvaluationResponse_cycleId_evaluateeId_idx" ON "EvaluationResponse"("cycleId", "evaluateeId")`);
    }

    // ここからPrisma Clientを使う
    const { prisma } = await import('@/lib/prisma');

    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { success: false, error: '既にアカウントが存在します。' },
        { status: 403 }
      );
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'email と password は必須です' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'admin' },
    });

    // ダミー社員データ
    const dummyPassword = await bcrypt.hash('password123', 10);
    const employees = [
      { employeeNumber: 'EMP001', name: '田中太郎', department: '営業部', position: '課長', grade: 'L3', email: 'tanaka@example.com', role: 'manager' },
      { employeeNumber: 'EMP002', name: '佐藤花子', department: '営業部', position: 'チーフ', grade: 'A3', email: 'sato@example.com', role: 'employee' },
      { employeeNumber: 'EMP003', name: '鈴木一郎', department: '開発部', position: 'ユニットマネージャー', grade: 'U2', email: 'suzuki@example.com', role: 'manager' },
      { employeeNumber: 'EMP004', name: '高橋美咲', department: '開発部', position: '担当', grade: 'A1', email: 'takahashi@example.com', role: 'employee' },
      { employeeNumber: 'EMP005', name: '山田健一', department: '経営企画部', position: '本部長', grade: 'D1', email: 'yamada@example.com', role: 'admin' },
    ];

    for (const emp of employees) {
      const empUser = await prisma.user.create({
        data: { email: emp.email, passwordHash: dummyPassword, role: emp.role },
      });
      await prisma.employee.create({
        data: {
          employeeNumber: emp.employeeNumber, name: emp.name, department: emp.department,
          position: emp.position, grade: emp.grade, email: emp.email, userId: empUser.id,
        },
      });
    }

    const tanaka = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP001' } });
    const suzuki = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP003' } });
    if (tanaka) await prisma.employee.update({ where: { employeeNumber: 'EMP002' }, data: { managerId: tanaka.id } });
    if (suzuki) await prisma.employee.update({ where: { employeeNumber: 'EMP004' }, data: { managerId: suzuki.id } });

    return NextResponse.json({
      success: true,
      message: `セットアップ完了。管理者: ${user.email}、ダミー社員5名を作成しました。`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `セットアップエラー: ${e}` },
      { status: 500 }
    );
  } finally {
    await rawPrisma.$disconnect();
  }
}
