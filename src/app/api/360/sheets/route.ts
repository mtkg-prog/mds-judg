import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { get360EvalSheetNames } from '@/lib/google-sheets';

/** 360eval系シート名の一覧を返す（管理者のみ） */
export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
    }

    const sheetNames = await get360EvalSheetNames();
    return NextResponse.json({ success: true, sheetNames });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `シート名取得エラー: ${e}` },
      { status: 500 }
    );
  }
}
