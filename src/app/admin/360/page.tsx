'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CycleTable } from '@/components/360/cycle-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { assignments: number; responses: number };
}

export default function Admin360Page() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });

  async function fetchCycles() {
    const res = await fetch('/api/360/cycles');
    const data = await res.json();
    if (data.success) setCycles(data.cycles);
    setLoading(false);
  }

  useEffect(() => { fetchCycles(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/360/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setForm({ name: '', startDate: '', endDate: '' });
      router.push(`/admin/360/${data.cycle.id}`);
    } else {
      alert(data.error);
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/360/cycles/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setCycles((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(data.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">360度評価 管理</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">新規サイクル作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="name">サイクル名</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="2026年上期 360度評価"
                required
                className="w-64"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">開始日</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">終了日</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? '作成中...' : '作成'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : (
        <CycleTable cycles={cycles} onDelete={handleDelete} />
      )}
    </div>
  );
}
