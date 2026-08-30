'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Eval360Dimension } from '@/lib/types';

interface EvaluationFormProps {
  assignmentId: string;
  evaluateeName: string;
  relationship: string;
  dimensions: Eval360Dimension[];
}

export function EvaluationForm({
  assignmentId,
  evaluateeName,
  relationship,
  dimensions,
}: EvaluationFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const dim of dimensions) init[dim.key] = 0;
    return init;
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('この評価を提出しますか？提出後は変更できません。')) return;

    setSubmitting(true);
    const res = await fetch(`/api/360/assignments/${assignmentId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, comment }),
    });
    const data = await res.json();
    if (data.success) {
      router.push('/360');
      router.refresh();
    } else {
      alert(data.error);
      setSubmitting(false);
    }
  }

  const relationshipLabel: Record<string, string> = {
    '上司': '上司として評価',
    '同僚': '同僚として評価',
    '部下': '部下として評価',
    '本人': '自己評価',
  };

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
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {evaluateeName} の評価
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {relationshipLabel[relationship] || relationship}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.map((group, gi) => (
            <div key={group.category ?? `ungrouped-${gi}`} className="space-y-4">
              {group.category && (
                <h3 className="text-base font-bold text-gray-900 bg-gray-50 rounded px-3 py-2 border-l-4 border-blue-500">
                  {group.category}
                </h3>
              )}
              {group.items.map((dim) => (
                <div key={dim.key} className={group.category ? 'pl-3' : ''}>
                  <Label className="text-sm font-medium">{dim.label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{dim.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[0, 1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setScores((s) => ({ ...s, [dim.key]: val }))}
                        className={`w-9 h-9 rounded-full border-2 text-sm font-medium transition-colors ${
                          scores[dim.key] === val
                            ? val === 0
                              ? 'bg-gray-500 text-white border-gray-500'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">
                      0=判断できない / 1=あてはまらない 〜 5=あてはまる
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div>
            <Label htmlFor="comment" className="text-sm font-medium">コメント（任意）</Label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="具体的なフィードバックがあれば記入してください"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? '送信中...' : '評価を提出する'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
