'use client';

import { useState } from 'react';
import { CheckForm } from '@/components/check/check-form';
import { ScoreResult } from '@/components/check/score-result';
import type { CheckResult, GradeResult, MissionInput, MissionWithScore, Position, ScoringResponse } from '@/lib/types';
import { roundToTwo } from '@/lib/utils';

export default function CheckPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(position: Position, missions: MissionInput[]) {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const scoredMissions: MissionWithScore[] = [];

      for (const mission of missions) {
        const res = await fetch('/api/scoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position, mission }),
        });

        const data: ScoringResponse = await res.json();

        if (!data.success) {
          setError(data.error || 'AI採点に失敗しました。');
          setIsLoading(false);
          return;
        }

        scoredMissions.push({
          input: mission,
          scores: data.scores,
          missionWeightedPoint: data.missionWeightedPoint,
        });
      }

      const totalPoint = roundToTwo(
        scoredMissions.reduce((sum, m) => sum + (m.missionWeightedPoint || 0), 0)
      );

      const gradeRes = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, totalPoint }),
      });
      const gradeData: { success: boolean; error?: string } & GradeResult = await gradeRes.json();
      if (!gradeData.success) {
        setError(gradeData.error || 'グレード判定に失敗しました。');
        setIsLoading(false);
        return;
      }
      const { gradeNumber, gradeLabel, gradePay } = gradeData;

      setResult({
        missions: scoredMissions,
        totalPoint,
        gradeNumber,
        gradeLabel,
        gradePay,
      });
    } catch (e) {
      setError(`エラーが発生しました: ${e}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">セルフチェック</h1>
        <p className="text-muted-foreground">
          ミッション内容を入力して、AIがどう採点するかを確認できます。データは保存されません。
        </p>
      </div>

      <CheckForm onSubmit={handleSubmit} isLoading={isLoading} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {result && <ScoreResult result={result} />}
    </div>
  );
}
