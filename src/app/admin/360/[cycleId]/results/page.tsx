'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProgressEntry {
  evaluateeId: string;
  name: string;
  department: string;
  total: number;
  submitted: number;
}

export default function ResultsOverviewPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [employees, setEmployees] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/360/cycles/${cycleId}/assignments`);
      const data = await res.json();
      if (!data.success) { setLoading(false); return; }

      // 匿名性確保: APIから返される被評価者ごとの集計進捗のみ使用
      setEmployees(data.progress as ProgressEntry[]);
      setLoading(false);
    }
    fetch_();
  }, [cycleId]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/admin/360/${cycleId}`} className="text-sm text-muted-foreground hover:underline">
          ← サイクル詳細
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6">360度評価 結果一覧</h1>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>氏名</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>進捗</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  データがありません
                </TableCell>
              </TableRow>
            )}
            {employees.map((emp) => (
              <TableRow key={emp.evaluateeId}>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>
                  <Badge variant={emp.submitted === emp.total ? 'default' : 'secondary'}>
                    {emp.submitted} / {emp.total}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/360/${cycleId}/results/${emp.evaluateeId}`}>
                    <Button variant="outline" size="sm">結果</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
