import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { load360Dimensions } from '@/lib/master-data';
import { aggregateResponsesByEmployee, type EmployeeResultRow } from '@/lib/360-result-aggregation';
import type { Eval360Dimension } from '@/lib/types';

/**
 * GET /api/360/cycles/[id]/results
 * サイクル全体の評価結果を一括取得（管理者専用）
 * ?format=csv でCSVダウンロード対応
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const { id: cycleId } = await params;
    const cycle = await prisma.evaluationCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      return NextResponse.json({ success: false, error: 'サイクルが見つかりません' }, { status: 404 });
    }

    // ディメンション定義を取得
    const dimensions = await load360Dimensions(cycle.dimensionSheetName);

    // ディメンション→カテゴリのマップを構築
    const dimensionCategoryMap: Record<string, string> = {};
    for (const dim of dimensions) {
      dimensionCategoryMap[dim.key] = dim.category || '未分類';
    }

    // 全レスポンスを一括取得
    const responses = await prisma.evaluationResponse.findMany({
      where: { cycleId },
      select: { evaluateeId: true, relationship: true, scores: true },
    });

    // 割当の進捗を被評価者ごとに集計（本人評価を除外）
    const assignments = await prisma.evaluationAssignment.findMany({
      where: { cycleId, relationship: { not: '本人' } },
      select: { evaluateeId: true, status: true },
    });

    const assignmentCounts = new Map<string, { total: number; submitted: number }>();
    for (const a of assignments) {
      const counts = assignmentCounts.get(a.evaluateeId) || { total: 0, submitted: 0 };
      counts.total++;
      if (a.status === 'submitted') counts.submitted++;
      assignmentCounts.set(a.evaluateeId, counts);
    }

    // 対象従業員の情報を取得
    const employeeIds = new Set([
      ...responses.map((r) => r.evaluateeId),
      ...assignments.map((a) => a.evaluateeId),
    ]);
    const employees = await prisma.employee.findMany({
      where: { id: { in: [...employeeIds] } },
      select: { id: true, name: true, department: true, position: true },
    });
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // 集計
    const results = aggregateResponsesByEmployee(
      responses, employeeMap, assignmentCounts, dimensionCategoryMap
    );

    // CSV形式の場合
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'csv') {
      return buildCsvResponse(results, dimensions, cycle.name);
    }

    return NextResponse.json({
      success: true,
      cycleName: cycle.name,
      dimensions,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `結果取得エラー: ${e}` },
      { status: 500 }
    );
  }
}

/** CSV レスポンスを構築 */
function buildCsvResponse(
  results: EmployeeResultRow[],
  dimensions: Eval360Dimension[],
  cycleName: string
): NextResponse {
  // カテゴリ一覧を抽出（重複排除・順序保持）
  const categories: string[] = [];
  for (const dim of dimensions) {
    const cat = dim.category || '未分類';
    if (!categories.includes(cat)) categories.push(cat);
  }

  // ヘッダー行
  const headers = ['氏名', '部署', '役職', '総合平均', ...categories, '回答数', '進捗'];
  const rows = [headers.join(',')];

  for (const r of results) {
    const cols = [
      escapeCsv(r.name),
      escapeCsv(r.department),
      escapeCsv(r.position),
      String(r.overallAverage),
      ...categories.map((cat) => String(r.categoryAverages[cat] ?? '')),
      String(r.responseCount),
      `${r.submittedAssignments}/${r.totalAssignments}`,
    ];
    rows.push(cols.join(','));
  }

  // BOM付きUTF-8でExcel対応
  const bom = '\uFEFF';
  const csv = bom + rows.join('\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="360eval_${cycleName}_${today}.csv"`,
    },
  });
}

/** CSV用エスケープ（カンマ・改行・ダブルクォートを含む場合に囲む） */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
