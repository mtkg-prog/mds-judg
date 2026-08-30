'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ResultSummary } from '@/components/360/result-summary';
import type { Eval360ResultView, Eval360Dimension } from '@/lib/types';

export default function MyResultsPage() {
  const [results, setResults] = useState<Eval360ResultView[]>([]);
  const [dimensions, setDimensions] = useState<Eval360Dimension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      // 割当一覧を取得してサイクル情報を収集
      const resAssignments = await fetch('/api/360/assignments');
      const dataAssignments = await resAssignments.json();

      if (!dataAssignments.success) {
        setLoading(false);
        return;
      }

      // 完了済みサイクルのIDを収集
      const res = await fetch('/api/360/cycles');
      let cycleIds: string[] = [];

      if (res.ok) {
        const cyclesData = await res.json();
        if (cyclesData.success) {
          cycleIds = cyclesData.cycles
            .filter((c: { status: string }) => c.status === 'closed')
            .map((c: { id: string }) => c.id);
        }
      }

      if (cycleIds.length === 0) {
        const closedCycles = new Set(
          dataAssignments.assignments
            .filter((a: { cycleStatus: string }) => a.cycleStatus === 'closed')
            .map((a: { cycleId: string }) => a.cycleId)
        );
        cycleIds = Array.from(closedCycles) as string[];
      }

      const allResults: Eval360ResultView[] = [];

      for (const cycleId of cycleIds) {
        const [resultRes, dimsRes] = await Promise.all([
          fetch(`/api/360/results/me?cycleId=${cycleId}`),
          fetch(`/api/360/dimensions?cycleId=${cycleId}`),
        ]);

        if (resultRes.ok) {
          const resultData = await resultRes.json();
          if (resultData.success) {
            allResults.push(resultData.result);
          }
        }

        // 最後のサイクルのディメンションを使用（複数サイクルの場合はサイクルごとに異なる可能性あり）
        if (dimsRes.ok) {
          const dimsData = await dimsRes.json();
          if (dimsData.success) {
            setDimensions(dimsData.dimensions);
          }
        }
      }

      setResults(allResults);
      setLoading(false);
    }
    fetch_();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/360" className="text-sm text-muted-foreground hover:underline">
          ← 360度評価
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">自分の360度評価結果</h1>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground">まだ結果がありません</p>
      ) : (
        <div className="space-y-8">
          {results.map((result, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold mb-4">{result.cycleName}</h2>
              <ResultSummary result={result} dimensions={dimensions} showDetail={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
