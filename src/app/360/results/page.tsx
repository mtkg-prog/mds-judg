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
      // Get my assignments to discover my employeeId and available cycles
      const [resAssignments, resDims] = await Promise.all([
        fetch('/api/360/assignments'),
        fetch('/api/360/dimensions'),
      ]);
      const dataAssignments = await resAssignments.json();
      const dataDims = await resDims.json();

      if (dataDims.success) setDimensions(dataDims.dimensions);

      if (!dataAssignments.success) {
        setLoading(false);
        return;
      }

      // Find cycles where evaluations have been submitted (self-evaluations reveal my ID)
      // We need to get results for each closed cycle
      // Use the cycles API to find closed ones, then fetch results
      const res = await fetch('/api/360/cycles');
      // If not admin, this may fail - fall back to assignment-based cycle discovery
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
        // Discover from assignments
        const closedCycles = new Set(
          dataAssignments.assignments
            .filter((a: { cycleStatus: string }) => a.cycleStatus === 'closed')
            .map((a: { cycleId: string }) => a.cycleId)
        );
        cycleIds = Array.from(closedCycles) as string[];
      }

      // Fetch results for each cycle - we use a self endpoint
      // We need to find my employeeId - look for a self-evaluation assignment
      const selfAssignment = dataAssignments.assignments.find(
        (a: { relationship: string }) => a.relationship === '本人'
      );

      if (!selfAssignment) {
        setLoading(false);
        return;
      }

      // Infer employeeId: In a self-evaluation, evaluateeName is my name
      // But we need the actual ID. Let's fetch results using a special path.
      // The API at /api/360/results/[employeeId] checks session, so we need to know our ID.
      // Let's try fetching our own session info
      const sessionRes = await fetch('/api/health');
      // Actually we can use the assignments to find cycles, then try each cycle
      const allResults: Eval360ResultView[] = [];

      for (const cycleId of cycleIds) {
        // Try fetching with "me" - we'll adjust the API to support this
        const resultRes = await fetch(`/api/360/results/me?cycleId=${cycleId}`);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          if (resultData.success) {
            allResults.push(resultData.result);
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
              <ResultSummary result={result} dimensions={dimensions} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
