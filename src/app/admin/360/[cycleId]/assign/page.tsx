'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Assignment {
  id: string;
  relationship: string;
  evaluator: { id: string; name: string; department: string };
  evaluatee: { id: string; name: string; department: string };
}

export default function AssignPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/360/cycles/${cycleId}/assignments`);
      const data = await res.json();
      if (data.success) setAssignments(data.assignments);
      setLoading(false);
    }
    fetch_();
  }, [cycleId]);

  // Group by evaluatee
  const grouped = new Map<string, { name: string; department: string; assignments: Assignment[] }>();
  for (const a of assignments) {
    const key = a.evaluatee.id;
    if (!grouped.has(key)) {
      grouped.set(key, { name: a.evaluatee.name, department: a.evaluatee.department, assignments: [] });
    }
    grouped.get(key)!.assignments.push(a);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/admin/360/${cycleId}`} className="text-sm text-muted-foreground hover:underline">
          ← サイクル詳細
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">評価者割当</h1>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : assignments.length === 0 ? (
        <p className="text-muted-foreground">割当がありません。サイクル詳細画面から自動割当を実行してください。</p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([evaluateeId, group]) => (
            <div key={evaluateeId} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-medium">
                {group.name}
                <span className="text-sm text-muted-foreground ml-2">{group.department}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>評価者</TableHead>
                    <TableHead>部署</TableHead>
                    <TableHead>関係</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.evaluator.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.evaluator.department}</TableCell>
                      <TableCell>{a.relationship}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
