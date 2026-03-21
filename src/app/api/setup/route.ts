import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';

export async function POST(request: Request) {
  try {
    // テーブルが存在しない場合はprisma db pushを実行
    try {
      await prisma.user.count();
    } catch {
      // テーブルが存在しない - db pushを実行
      try {
        execSync('npx prisma db push --skip-generate', {
          env: process.env as NodeJS.ProcessEnv,
          stdio: 'pipe',
        });
      } catch (pushError) {
        return NextResponse.json(
          { success: false, error: `テーブル作成エラー: ${pushError}` },
          { status: 500 }
        );
      }
    }

    // 既にユーザーが存在する場合はブロック
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { success: false, error: '既にアカウントが存在します。このエンドポイントは初回セットアップ時のみ使用できます。' },
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

    // 管理者ユーザー作成
    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'admin' },
    });

    // ダミー社員データ作成
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
          employeeNumber: emp.employeeNumber,
          name: emp.name,
          department: emp.department,
          position: emp.position,
          grade: emp.grade,
          email: emp.email,
          userId: empUser.id,
        },
      });
    }

    // 上長関係を設定
    const tanaka = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP001' } });
    const suzuki = await prisma.employee.findUnique({ where: { employeeNumber: 'EMP003' } });
    if (tanaka) {
      await prisma.employee.update({ where: { employeeNumber: 'EMP002' }, data: { managerId: tanaka.id } });
    }
    if (suzuki) {
      await prisma.employee.update({ where: { employeeNumber: 'EMP004' }, data: { managerId: suzuki.id } });
    }

    return NextResponse.json({
      success: true,
      message: `セットアップ完了。管理者: ${user.email}、ダミー社員5名を作成しました。`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `セットアップエラー: ${e}` },
      { status: 500 }
    );
  }
}
