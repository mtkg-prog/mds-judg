'use client';

import { useState } from 'react';
import { CheckForm } from '@/components/check/check-form';
import { ScoreResult } from '@/components/check/score-result';
import type { CheckResult, DepartmentType, GradeResult, MissionInput, MissionWithScore, Position, QuantitativeInput, ScoringResponse } from '@/lib/types';
import { roundToTwo } from '@/lib/utils';

export default function CheckPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(position: Position, departmentType: DepartmentType, missions: MissionInput[], quantitative?: QuantitativeInput) {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const scoredMissions: MissionWithScore[] = [];

      for (const mission of missions) {
        const res = await fetch('/api/scoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position, departmentType, mission, quantitative }),
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

      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <p className="text-sm font-bold">この結果はAIによる参考値です</p>
        <p className="mt-2 text-xs">
          ここで表示されるスコア・グレードはAIがミッション内容を分析した参考値であり、確定的な評価ではありません。
          実際のグレードは、ミッションの難易度や予算の規模感などを含むさまざまな要素によって総合的に判断されます。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>ミッションの難易度・挑戦度合い</li>
          <li>売り上げや利益の規模・前年比</li>
          <li>マネジメントの規模</li>
          <li>苦戦しているエリアの立て直し等の状況</li>
          <li>360度評価</li>
          <li>その他、会社が定める評価基準</li>
        </ul>
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
