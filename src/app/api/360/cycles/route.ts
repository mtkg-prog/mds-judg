import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const cycles = await prisma.evaluationCycle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { assignments: true, responses: true } },
      },
    });

    return NextResponse.json({ success: true, cycles });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サイクル取得エラー: ${e}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { name, startDate, endDate } = await request.json();

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'name, startDate, endDate は必須です' },
        { status: 400 }
      );
    }

    const cycle = await prisma.evaluationCycle.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json({ success: true, cycle }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サイクル作成エラー: ${e}` },
      { status: 500 }
    );
  }
}
