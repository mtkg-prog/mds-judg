import { NextResponse } from 'next/server';
import { resolveGrade } from '@/lib/master-data';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }
    const { position, totalPoint } = await request.json();

    if (!position || totalPoint == null) {
      return NextResponse.json(
        { success: false, error: 'position と totalPoint は必須です。' },
        { status: 400 }
      );
    }

    const result = await resolveGrade(position, totalPoint);

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `グレード判定エラー: ${e}` },
      { status: 500 }
    );
  }
}
