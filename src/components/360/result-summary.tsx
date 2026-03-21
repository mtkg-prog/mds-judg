'use client';

import { ResultCategoryCard } from './result-category-card';
import type { Eval360ResultView, Eval360Dimension } from '@/lib/types';

interface ResultSummaryProps {
  result: Eval360ResultView;
  dimensions: Eval360Dimension[];
}

function OverallScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 sm:w-36 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export function ResultSummary({ result, dimensions }: ResultSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">総合スコア</h3>
        <div className="space-y-2">
          {dimensions.map((dim) => (
            <OverallScoreBar
              key={dim.key}
              label={dim.label}
              score={result.overallAverages[dim.key] ?? 0}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {result.categories.map((cat) => (
          <ResultCategoryCard
            key={cat.relationship}
            category={cat}
            dimensions={dimensions}
          />
        ))}
      </div>
    </div>
  );
}
