'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Eval360CategoryResult, Eval360Dimension } from '@/lib/types';

interface ResultCategoryCardProps {
  category: Eval360CategoryResult;
  dimensions: Eval360Dimension[];
}

const relationshipLabel: Record<string, string> = {
  '上司': '上司から',
  '同僚': '同僚から',
  '部下': '部下から',
  '本人': '自己評価',
};

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export function ResultCategoryCard({ category, dimensions }: ResultCategoryCardProps) {
  const label = relationshipLabel[category.relationship] || category.relationship;

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{label}</span>
          <span className="text-sm font-normal text-muted-foreground">
            回答数: {category.responseCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
              <div key={dim.key} className={group.category ? 'pl-2' : ''}>
                {dim.description && (
                  <div className="text-xs text-muted-foreground mb-1">{dim.description}</div>
                )}
                <ScoreBar score={category.averageScores[dim.key] ?? 0} />
              </div>
            ))}
          </div>
        ))}

        {category.comments.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <div className="text-sm font-medium mb-2">コメント</div>
            <ul className="space-y-2">
              {category.comments.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
