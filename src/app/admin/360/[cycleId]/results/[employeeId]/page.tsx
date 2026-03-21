'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ResultSummary } from '@/components/360/result-summary';
import type { Eval360ResultView, Eval360Dimension } from '@/lib/types';

export default function EmployeeResultPage() {
  const { cycleId, employeeId } = useParams<{ cycleId: string; employeeId: string }>();
  const [result, setResult] = useState<Eval360ResultView | null>(null);
  const [dimensions, setDimensions] = useState<Eval360Dimension[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const [resResult, resDims] = await Promise.all([
        fetch(`/api/360/results/${employeeId}?cycleId=${cycleId}`),
        fetch(`/api/360/dimensions?evaluateeId=${employeeId}`),
      ]);
      const dataResult = await resResult.json();
      const dataDims = await resDims.json();

      if (dataResult.success) setResult(dataResult.result);
      if (dataDims.success) setDimensions(dataDims.dimensions);
      setLoading(false);
    }
    fetch_();
  }, [cycleId, employeeId]);

  if (loading) return <div className="mx-auto max-w-4xl px-6 py-8">読み込み中...</div>;
  if (!result) return <div className="mx-auto max-w-4xl px-6 py-8">結果がありません</div>;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/admin/360/${cycleId}/results`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 結果一覧
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">{result.evaluateeName}</h1>
      <p className="text-sm text-muted-foreground mb-6">{result.cycleName}</p>

      <ResultSummary result={result} dimensions={dimensions} />
    </div>
  );
}
