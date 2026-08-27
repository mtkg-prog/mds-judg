'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { CheckResult } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

/** 全採点次元のラベル定義（6次元 + 2次元） */
const SCORE_LABELS: Record<string, string> = {
  difficulty: '難易度',
  scope: '影響範囲',
  innovation: '新規性',
  contribution: '課題寄与',
  roleLevel: '立ち位置',
  feasibility: '実現可能性',
  budgetScale: '予算規模',
  growthChallenge: '成長性',
};

function getScoreColor(score: number): string {
  if (score <= 2) return 'bg-red-100 text-red-800';
  if (score <= 4) return 'bg-orange-100 text-orange-800';
  if (score <= 6) return 'bg-yellow-100 text-yellow-800';
  if (score <= 8) return 'bg-green-100 text-green-800';
  return 'bg-emerald-100 text-emerald-800';
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge variant="outline" className={getScoreColor(score)}>
      {score} / 10
    </Badge>
  );
}

interface ScoreResultProps {
  result: CheckResult;
}

export function ScoreResult({ result }: ScoreResultProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle>総合結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">総合ポイント</p>
              <p className="text-3xl font-bold">{result.totalPoint}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">判定グレード</p>
              <p className="text-3xl font-bold text-blue-600">{result.gradeLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">グレード給</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(result.gradePay)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-bold">この結果はAIによる参考値です</p>
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

      {result.missions.map((mission, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle>ミッション {index + 1}: {mission.input.m1_missionName}</CardTitle>
              <Badge variant="secondary" className="shrink-0">
                ウェイト: {mission.input.weight}% / 加重ポイント: {mission.missionWeightedPoint}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mission.scores && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.keys(SCORE_LABELS).map(key => {
                    const score = mission.scores![key as keyof typeof mission.scores];
                    // undefinedの次元（定量データ未入力時のbudgetScale等）はスキップ
                    if (score === undefined || typeof score !== 'number') return null;
                    return (
                      <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{SCORE_LABELS[key]}</span>
                        <ScoreBadge score={score} />
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">AIコメント</p>
                  <p className="mt-1">{mission.scores.comment}</p>
                </div>

                {mission.scores.advice && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <p className="text-sm font-medium text-blue-700">レベルアップのヒント</p>
                    <p className="mt-1 text-sm text-blue-900">{mission.scores.advice}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
