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
              <div key={dim.key} className={`${group.category ? 'pl-2' : ''} flex items-center gap-3 border-b border-gray-100 pb-2`}>
                <div className="w-48 sm:w-64 shrink-0">
                  {dim.description && (
                    <p className="text-xs text-gray-700">{dim.description}</p>
                  )}
                </div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(category.averageScores[dim.key] ?? 0) / 10 * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-8 text-right">{(category.averageScores[dim.key] ?? 0).toFixed(1)}</span>
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
