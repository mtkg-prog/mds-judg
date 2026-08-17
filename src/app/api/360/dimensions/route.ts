import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { load360Dimensions, load360DimensionsForGroup, resolvePositionGroupByPosition } from '@/lib/master-data';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }

    const evaluateeId = request.nextUrl.searchParams.get('evaluateeId');
    const cycleId = request.nextUrl.searchParams.get('cycleId');

    // サイクルに紐づくシート名を取得
    let sheetName: string | undefined;
    if (cycleId) {
      const cycle = await prisma.evaluationCycle.findUnique({
        where: { id: cycleId },
        select: { dimensionSheetName: true },
      });
      if (cycle) {
        sheetName = cycle.dimensionSheetName;
      }
    }

    if (evaluateeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: evaluateeId },
        select: { position: true },
      });

      if (employee) {
        const group = await resolvePositionGroupByPosition(employee.position);
        const dimensions = await load360DimensionsForGroup(group, sheetName);
        return NextResponse.json({ success: true, dimensions });
      }
    }

    const dimensions = await load360Dimensions(sheetName);
    return NextResponse.json({ success: true, dimensions });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `評価項目取得エラー: ${e}` },
      { status: 500 }
    );
  }
}
