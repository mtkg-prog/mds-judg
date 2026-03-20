'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { CheckResult } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const SCORE_LABELS: Record<string, string> = {
  difficulty: '難易度',
  scope: '影響範囲',
  innovation: '新規性',
  contribution: '課題寄与',
  roleLevel: '立ち位置',
  feasibility: '実現可能性',
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
          <div className="grid grid-cols-3 gap-4 text-center">
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

      {result.missions.map((mission, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ミッション {index + 1}: {mission.input.m1_missionName}</CardTitle>
              <Badge variant="secondary">
                ウェイト: {mission.input.weight}% / 加重ポイント: {mission.missionWeightedPoint}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mission.scores && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>).map(key => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">{SCORE_LABELS[key]}</span>
                      <ScoreBadge score={mission.scores![key as keyof typeof mission.scores] as number} />
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">AIコメント</p>
                  <p className="mt-1">{mission.scores.comment}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
