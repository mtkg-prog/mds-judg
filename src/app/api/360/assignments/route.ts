import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }

    if (!user.employeeId) {
      return NextResponse.json({ success: false, error: '従業員情報が紐付いていません' }, { status: 400 });
    }

    const cycleId = request.nextUrl.searchParams.get('cycleId');

    const assignments = await prisma.evaluationAssignment.findMany({
      where: {
        evaluatorId: user.employeeId,
        ...(cycleId ? { cycleId } : {}),
      },
      include: {
        evaluatee: { select: { name: true, department: true } },
        cycle: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = assignments.filter(
      (a) => a.cycle.status === 'open' || a.status === 'submitted'
    );
    const views = filtered.map((a) => ({
      id: a.id,
      cycleId: a.cycle.id,
      cycleName: a.cycle.name,
      cycleStatus: a.cycle.status,
      evaluateeId: a.evaluateeId,
      evaluateeName: a.evaluatee.name,
      evaluateeDepartment: a.evaluatee.department,
      relationship: a.relationship,
      status: a.status,
    }));

    return NextResponse.json({ success: true, assignments: views });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `割当取得エラー: ${e}` },
      { status: 500 }
    );
  }
}
