'use client';

import { ResultCategoryCard } from './result-category-card';
import { ResultRadarChart } from './result-radar-chart';
import type { Eval360ResultView, Eval360Dimension } from '@/lib/types';

interface ResultSummaryProps {
  result: Eval360ResultView;
  dimensions: Eval360Dimension[];
}

function OverallScoreBar({ description, score }: { description: string; score: number }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
      <div className="w-48 sm:w-64 shrink-0">
        {description && (
          <p className="text-xs text-gray-700">{description}</p>
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
                <div className="text-sm font-bold text-gray-900 bg-gray-50 rounded px-2 py-1.5 border-l-4 border-blue-500">
                  {group.category}
                  {group.items[0]?.label && group.items[0].label !== group.category && (
                    <span className="ml-2 text-xs font-normal text-gray-500">{group.items[0].label}</span>
                  )}
                </div>
              )}
              {group.items.map((dim) => (
                <OverallScoreBar
                  key={dim.key}
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
