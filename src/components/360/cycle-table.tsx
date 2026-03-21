'use client';

import Link from 'next/link';
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

interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { assignments: number; responses: number };
}

interface CycleTableProps {
  cycles: Cycle[];
  onDelete?: (id: string) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">下書き</Badge>;
    case 'open':
      return <Badge variant="default">実施中</Badge>;
    case 'closed':
      return <Badge variant="outline">終了</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function CycleTable({ cycles, onDelete }: CycleTableProps) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>サイクル名</TableHead>
          <TableHead>期間</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>割当数</TableHead>
          <TableHead>回答数</TableHead>
          <TableHead className="w-[140px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cycles.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              サイクルがありません
            </TableCell>
          </TableRow>
        )}
        {cycles.map((cycle) => (
          <TableRow key={cycle.id}>
            <TableCell>
              <Link href={`/admin/360/${cycle.id}`} className="text-blue-600 hover:underline">
                {cycle.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm">
              {new Date(cycle.startDate).toLocaleDateString()} 〜{' '}
              {new Date(cycle.endDate).toLocaleDateString()}
            </TableCell>
            <TableCell>{statusBadge(cycle.status)}</TableCell>
            <TableCell>{cycle._count.assignments}</TableCell>
            <TableCell>{cycle._count.responses}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Link href={`/admin/360/${cycle.id}`}>
                  <Button variant="outline" size="sm">詳細</Button>
                </Link>
                {cycle.status === 'draft' && onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`「${cycle.name}」を削除しますか？`)) {
                        onDelete(cycle.id);
                      }
                    }}
                  >
                    削除
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
