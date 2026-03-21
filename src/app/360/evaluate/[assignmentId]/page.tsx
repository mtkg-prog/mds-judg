'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EvaluationForm } from '@/components/360/evaluation-form';
import type { Eval360Dimension } from '@/lib/types';

interface AssignmentDetail {
  id: string;
  evaluateeId: string;
  evaluateeName: string;
  evaluateeDepartment: string;
  relationship: string;
  status: string;
  cycleStatus: string;
}

export default function EvaluatePage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [dimensions, setDimensions] = useState<Eval360Dimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetch_() {
      const resAssignments = await fetch('/api/360/assignments');
      const dataAssignments = await resAssignments.json();

      if (dataAssignments.success) {
        const found = dataAssignments.assignments.find(
          (a: AssignmentDetail) => a.id === assignmentId
        );
        if (found) {
          // Fetch dimensions for the evaluatee's position group
          const resDims = await fetch(`/api/360/dimensions?evaluateeId=${found.evaluateeId}`);
          const dataDims = await resDims.json();
          if (dataDims.success) setDimensions(dataDims.dimensions);

          if (found.status === 'submitted') {
            setError('この評価は既に提出済みです');
          } else if (found.cycleStatus !== 'open') {
            setError('このサイクルは現在回答を受け付けていません');
          } else {
            setAssignment(found);
          }
        } else {
          setError('割当が見つかりません');
        }
      }
      setLoading(false);
    }
    fetch_();
  }, [assignmentId]);

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-8">読み込み中...</div>;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/360" className="text-blue-600 hover:underline">← 360度評価に戻る</Link>
      </div>
    );
  }

  if (!assignment || dimensions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-muted-foreground mb-4">データが取得できません</p>
        <Link href="/360" className="text-blue-600 hover:underline">← 360度評価に戻る</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/360" className="text-sm text-muted-foreground hover:underline">
          ← 360度評価
        </Link>
      </div>

      <EvaluationForm
        assignmentId={assignmentId}
        evaluateeName={assignment.evaluateeName}
        relationship={assignment.relationship}
        dimensions={dimensions}
      />
    </div>
  );
}
