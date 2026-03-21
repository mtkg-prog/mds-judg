import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
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
    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'admin' },
    });

    return NextResponse.json({
      success: true,
      message: `管理者アカウントを作成しました: ${user.email}`,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `セットアップエラー: ${e}` },
      { status: 500 }
    );
  }
}
