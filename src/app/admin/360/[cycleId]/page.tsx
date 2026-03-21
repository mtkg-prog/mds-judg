'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CycleDetail {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { assignments: number; responses: number };
}

export default function CycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchCycle() {
    const res = await fetch(`/api/360/cycles/${cycleId}`);
    const data = await res.json();
    if (data.success) {
      setCycle(data.cycle);
      setPendingCount(data.pendingCount);
      setSubmittedCount(data.submittedCount);
    }
    setLoading(false);
  }

  useEffect(() => { fetchCycle(); }, [cycleId]);

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/360/cycles/${cycleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) fetchCycle();
    else alert(data.error);
  }

  async function handleSheetImport() {
    if (!confirm('スプレッドシートの360assignシートから評価者割当を読み込みます。よろしいですか？')) return;
    const res = await fetch(`/api/360/cycles/${cycleId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importFromSheet: true }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`${data.created}件の割当を作成しました`);
      fetchCycle();
    } else {
      alert(data.error);
    }
  }

  async function handleAutoAssign() {
    if (!confirm('全従業員に対して自動で評価者を割り当てます。よろしいですか？')) return;
    const res = await fetch(`/api/360/cycles/${cycleId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoAssign: true }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`${data.created}件の割当を作成しました`);
      fetchCycle();
    } else {
      alert(data.error);
    }
  }

  if (loading) return <div className="mx-auto max-w-4xl px-6 py-8">読み込み中...</div>;
  if (!cycle) return <div className="mx-auto max-w-4xl px-6 py-8">サイクルが見つかりません</div>;

  const statusLabel: Record<string, string> = { draft: '下書き', open: '実施中', closed: '終了' };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/360" className="text-sm text-muted-foreground hover:underline">
          ← 360度評価 管理
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{cycle.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(cycle.startDate).toLocaleDateString()} 〜{' '}
            {new Date(cycle.endDate).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={cycle.status === 'open' ? 'default' : 'secondary'}>
          {statusLabel[cycle.status] || cycle.status}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">割当数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycle._count.assignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">回答済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{submittedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">未回答</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {cycle.status === 'draft' && (
          <>
            <Button onClick={handleSheetImport}>シートから読込</Button>
            <Button onClick={handleAutoAssign} variant="outline">自動割当</Button>
            <Link href={`/admin/360/${cycleId}/assign`}>
              <Button variant="outline">割当編集</Button>
            </Link>
            <Button onClick={() => handleStatusChange('open')}>
              評価を開始する
            </Button>
          </>
        )}
        {cycle.status === 'open' && (
          <>
            <Link href={`/admin/360/${cycleId}/assign`}>
              <Button variant="outline">割当確認</Button>
            </Link>
            <Button onClick={() => handleStatusChange('closed')} variant="outline">
              評価を終了する
            </Button>
          </>
        )}
        {cycle.status === 'closed' && (
          <Link href={`/admin/360/${cycleId}/results`}>
            <Button>結果を見る</Button>
          </Link>
        )}
        {(cycle.status === 'open' || cycle.status === 'closed') && (
          <Link href={`/admin/360/${cycleId}/results`}>
            <Button variant="outline">結果一覧</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
