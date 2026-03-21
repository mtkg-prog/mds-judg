import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;
    const cycle = await prisma.evaluationCycle.findUnique({
      where: { id },
      include: {
        _count: { select: { assignments: true, responses: true } },
      },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'サイクルが見つかりません' }, { status: 404 });
    }

    const pendingCount = await prisma.evaluationAssignment.count({
      where: { cycleId: id, status: 'pending' },
    });
    const submittedCount = await prisma.evaluationAssignment.count({
      where: { cycleId: id, status: 'submitted' },
    });

    return NextResponse.json({ success: true, cycle, pendingCount, submittedCount });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サイクル取得エラー: ${e}` },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, name, startDate, endDate } = body;

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (name) data.name = name;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);

    const cycle = await prisma.evaluationCycle.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, cycle });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サイクル更新エラー: ${e}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id } = await params;
    const cycle = await prisma.evaluationCycle.findUnique({ where: { id } });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'サイクルが見つかりません' }, { status: 404 });
    }

    if (cycle.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: '下書き状態のサイクルのみ削除できます' },
        { status: 400 }
      );
    }

    await prisma.evaluationCycle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サイクル削除エラー: ${e}` },
      { status: 500 }
    );
  }
}
