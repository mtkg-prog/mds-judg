'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AssignmentView {
  id: string;
  cycleId: string;
  cycleName: string;
  cycleStatus: string;
  evaluateeName: string;
  evaluateeDepartment: string;
  relationship: string;
  status: string;
}

export default function My360Page() {
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch('/api/360/assignments');
      const data = await res.json();
      if (data.success) setAssignments(data.assignments);
      setLoading(false);
    }
    fetch_();
  }, []);

  const pending = assignments.filter((a) => a.status === 'pending' && a.cycleStatus === 'open');
  const submitted = assignments.filter((a) => a.status === 'submitted');

  // Find cycles where I'm an evaluatee (for results)
  const closedCycleIds = [...new Set(
    assignments.filter((a) => a.cycleStatus === 'closed').map((a) => a.cycleId)
  )];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">360度評価</h1>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">未回答の評価</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">未回答の評価はありません</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>対象者</TableHead>
                      <TableHead>部署</TableHead>
                      <TableHead>関係</TableHead>
                      <TableHead>サイクル</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.evaluateeName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.evaluateeDepartment}</TableCell>
                        <TableCell>{a.relationship}</TableCell>
                        <TableCell className="text-sm">{a.cycleName}</TableCell>
                        <TableCell>
                          <Link href={`/360/evaluate/${a.id}`}>
                            <Button size="sm">回答</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">回答済み</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted.length === 0 ? (
                <p className="text-sm text-muted-foreground">回答済みの評価はありません</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>対象者</TableHead>
                      <TableHead>関係</TableHead>
                      <TableHead>サイクル</TableHead>
                      <TableHead>ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submitted.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.evaluateeName}</TableCell>
                        <TableCell>{a.relationship}</TableCell>
                        <TableCell className="text-sm">{a.cycleName}</TableCell>
                        <TableCell>
                          <Badge variant="default">提出済み</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {closedCycleIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">自分の結果を見る</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/360/results">
                  <Button variant="outline">360度評価の結果を見る</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
