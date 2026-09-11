import { NextRequest, NextResponse } from 'next/server';
import { buildScoringPrompt, calculateMissionWeightedPoint } from '@/lib/scoring';
import { callGeminiForScoring } from '@/lib/gemini';
import { getSession } from '@/lib/auth';
import { validateMissionContentQuality } from '@/lib/content-validation';
import type { ScoringRequest, ScoringResponse } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse<ScoringResponse>> {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, error: '認証が必要です' }, { status: 401 });
    }
    const body: ScoringRequest = await request.json();
    const { mission } = body;

    const MIN_CHAR_M1 = 10;
    const MIN_CHAR_DETAIL = 30;

    if (!mission.m1_missionName || mission.m1_missionName.length < MIN_CHAR_M1) {
      return NextResponse.json(
        { success: false, error: `ミッション名（M1）は${MIN_CHAR_M1}文字以上入力してください。` },
        { status: 400 }
      );
    }

    const detailFields = [
      { key: 'm2_backgroundGoal', label: 'M2' },
      { key: 'm3_contentDifficulty', label: 'M3' },
      { key: 'm4_stakeholdersRole', label: 'M4' },
      { key: 'm5_feasibilityEvidence', label: 'M5' },
    ] as const;

    for (const { key, label } of detailFields) {
      if (!mission[key] || mission[key].length < MIN_CHAR_DETAIL) {
        return NextResponse.json(
          { success: false, error: `${label}は${MIN_CHAR_DETAIL}文字以上入力してください。` },
          { status: 400 }
        );
      }
    }

    // 内容品質チェック（3段階: ok / warning / error）
    const qualityResult = validateMissionContentQuality(mission);
    if (qualityResult.level === 'error') {
      return NextResponse.json(
        { success: false, error: qualityResult.errorMessage },
        { status: 400 }
      );
    }

    // warningレベルの場合、プロンプトに品質注意を付加して採点続行
    const contentQualityLevel = qualityResult.level;
    const prompt = buildScoringPrompt(mission, body.position, body.departmentType, body.quantitative, contentQualityLevel);
    const result = await callGeminiForScoring(prompt);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI採点に失敗しました。' },
        { status: 500 }
      );
    }

    const missionWeightedPoint = calculateMissionWeightedPoint(result.data, mission.weight, body.position);

    // warningの場合、レスポンスに注意書きを含める
    const contentWarning = contentQualityLevel === 'warning'
      ? '記号や伏せ字が多く含まれているため、AI採点の精度が低下している可能性があります。実際のMDS提出時には具体的な内容を記述してください。'
      : undefined;

    return NextResponse.json({
      success: true,
      scores: result.data,
      missionWeightedPoint,
      contentWarning,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `サーバーエラー: ${e}` },
      { status: 500 }
    );
  }
}
