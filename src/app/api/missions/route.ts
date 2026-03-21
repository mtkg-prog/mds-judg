import { NextRequest, NextResponse } from 'next/server';
import { getAllMissions } from '@/lib/google-sheets';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!email || !key) {
      return NextResponse.json({ success: true, data: [], notConfigured: true });
    }

    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') || '';
    const department = searchParams.get('department') || '';
    const name = searchParams.get('name') || '';

    let missions = await getAllMissions();

    if (period) {
      missions = missions.filter(m => m.period === period);
    }
    if (department) {
      missions = missions.filter(m => m.department.includes(department));
    }
    if (name) {
      missions = missions.filter(m => m.name.includes(name));
    }

    return NextResponse.json({ success: true, data: missions });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `データ取得エラー: ${e}` },
      { status: 500 }
    );
  }
}
