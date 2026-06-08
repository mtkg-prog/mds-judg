'use client';

import { ResultCategoryCard } from './result-category-card';
import { ResultRadarChart } from './result-radar-chart';
import type { Eval360ResultView, Eval360Dimension } from '@/lib/types';

interface ResultSummaryProps {
  result: Eval360ResultView;
  dimensions: Eval360Dimension[];
}

function OverallScoreBar({ label, description, score }: { label: string; description: string; score: number }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 sm:w-36 shrink-0">
        <span className="text-sm">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
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
  // カテゴリでグループ化（シートの順序を維持）
  const grouped: { category: string | null; items: typeof dimensions }[] = [];
  for (const dim of dimensions) {
    const cat = dim.category || null;
    const last = grouped[grouped.length - 1];
    if (last && last.category === cat) {
      last.items.push(dim);
    } else {
      grouped.push({ category: cat, items: [dim] });
    }
  }

  return (
    <div className="space-y-6">
      <ResultRadarChart result={result} dimensions={dimensions} />

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">総合スコア</h3>
        <div className="space-y-3">
          {grouped.map((group, gi) => (
            <div key={group.category ?? `ungrouped-${gi}`} className="space-y-2">
              {group.category && (
                <div className="text-xs font-semibold text-gray-700 border-b border-gray-100 pb-1 pt-1">
                  {group.category}
                </div>
              )}
              {group.items.map((dim) => (
                <OverallScoreBar
                  key={dim.key}
                  label={dim.label}
                  description={dim.description}
                  score={result.overallAverages[dim.key] ?? 0}
                />
              ))}
            </div>
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
