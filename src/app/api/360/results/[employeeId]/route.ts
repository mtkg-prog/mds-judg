import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { EvaluationRelationship, Eval360CategoryResult } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }

    const { employeeId: rawId } = await params;
    const employeeId = rawId === 'me' ? user.employeeId : rawId;

    if (!employeeId) {
      return NextResponse.json({ success: false, error: '従業員情報が紐付いていません' }, { status: 400 });
    }

    // Access control: admin sees all, employees see only their own
    if (user.role !== 'admin' && user.employeeId !== employeeId) {
      return NextResponse.json({ success: false, error: 'アクセス権限がありません' }, { status: 403 });
    }

    const cycleId = request.nextUrl.searchParams.get('cycleId');
    if (!cycleId) {
      return NextResponse.json(
        { success: false, error: 'cycleId クエリパラメータは必須です' },
        { status: 400 }
      );
    }

    const cycle = await prisma.evaluationCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'サイクルが見つかりません' }, { status: 404 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: '従業員が見つかりません' }, { status: 404 });
    }

    const responses = await prisma.evaluationResponse.findMany({
      where: { cycleId, evaluateeId: employeeId },
    });

    // Group by relationship
    const grouped = new Map<string, typeof responses>();
    for (const r of responses) {
      const list = grouped.get(r.relationship) || [];
      list.push(r);
      grouped.set(r.relationship, list);
    }

    const categories: Eval360CategoryResult[] = [];
    const allScoreSums: Record<string, number> = {};
    const allScoreCounts: Record<string, number> = {};

    for (const [relationship, resps] of grouped) {
      const scoreSums: Record<string, number> = {};
      const scoreCounts: Record<string, number> = {};
      const comments: string[] = [];

      for (const r of resps) {
        const parsed = JSON.parse(r.scores) as Record<string, number>;
        for (const [key, val] of Object.entries(parsed)) {
          scoreSums[key] = (scoreSums[key] || 0) + val;
          scoreCounts[key] = (scoreCounts[key] || 0) + 1;
          allScoreSums[key] = (allScoreSums[key] || 0) + val;
          allScoreCounts[key] = (allScoreCounts[key] || 0) + 1;
        }
        if (r.comment.trim()) {
          comments.push(r.comment.trim());
        }
      }

      // Shuffle comments for anonymity
      for (let i = comments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [comments[i], comments[j]] = [comments[j], comments[i]];
      }

      const averageScores: Record<string, number> = {};
      for (const key of Object.keys(scoreSums)) {
        averageScores[key] = Math.round((scoreSums[key] / scoreCounts[key]) * 100) / 100;
      }

      categories.push({
        relationship: relationship as EvaluationRelationship,
        responseCount: resps.length,
        averageScores,
        comments,
      });
    }

    const overallAverages: Record<string, number> = {};
    for (const key of Object.keys(allScoreSums)) {
      overallAverages[key] = Math.round((allScoreSums[key] / allScoreCounts[key]) * 100) / 100;
    }

    return NextResponse.json({
      success: true,
      result: {
        evaluateeName: employee.name,
        cycleName: cycle.name,
        categories,
        overallAverages,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `結果取得エラー: ${e}` },
      { status: 500 }
    );
  }
}
