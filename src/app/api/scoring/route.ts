import { NextRequest, NextResponse } from 'next/server';
import { buildScoringPrompt, calculateMissionWeightedPoint } from '@/lib/scoring';
import { callGeminiForScoring } from '@/lib/gemini';
import { getSession } from '@/lib/auth';
import type { ScoringRequest, ScoringResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ScoringResponse>> {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }
    const body: ScoringRequest = await request.json();
    const { mission } = body;

    if (!mission.m1_missionName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'ミッション名（M1）が入力されていません。' },
        { status: 400 }
      );
    }

    const prompt = buildScoringPrompt(mission);
    const result = await callGeminiForScoring(prompt);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI採点に失敗しました。' },
        { status: 500 }
      );
    }

    const missionWeightedPoint = calculateMissionWeightedPoint(result.data, mission.weight);

    return NextResponse.json({
      success: true,
      scores: result.data,
      missionWeightedPoint,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サーバーエラー: ${e}` },
      { status: 500 }
    );
  }
}
