import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }

    if (!user.employeeId) {
      return NextResponse.json({ success: false, error: '従業員情報が紐付いていません' }, { status: 400 });
    }

    const { id: assignmentId } = await params;
    const { scores, comment } = await request.json();

    if (!scores || typeof scores !== 'object') {
      return NextResponse.json(
        { success: false, error: 'scores は必須です' },
        { status: 400 }
      );
    }

    // Validate scores are 1-10
    for (const [key, value] of Object.entries(scores)) {
      const num = Number(value);
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return NextResponse.json(
          { success: false, error: `${key} のスコアは1-10の整数で指定してください` },
          { status: 400 }
        );
      }
    }

    const assignment = await prisma.evaluationAssignment.findUnique({
      where: { id: assignmentId },
      include: { cycle: true },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: '割当が見つかりません' }, { status: 404 });
    }

    if (assignment.evaluatorId !== user.employeeId) {
      return NextResponse.json({ success: false, error: 'この評価を行う権限がありません' }, { status: 403 });
    }

    if (assignment.cycle.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'このサイクルは現在回答を受け付けていません' },
        { status: 400 }
      );
    }

    if (assignment.status === 'submitted') {
      return NextResponse.json(
        { success: false, error: 'この評価は既に提出済みです' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.evaluationResponse.create({
        data: {
          assignmentId,
          cycleId: assignment.cycleId,
          evaluateeId: assignment.evaluateeId,
          relationship: assignment.relationship,
          scores: JSON.stringify(scores),
          comment: comment || '',
        },
      }),
      prisma.evaluationAssignment.update({
        where: { id: assignmentId },
        data: { status: 'submitted' },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `回答送信エラー: ${e}` },
      { status: 500 }
    );
  }
}
