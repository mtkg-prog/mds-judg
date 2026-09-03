'use client';

import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { EmployeeResultRow } from '@/lib/360-result-aggregation';

export type SortKey = 'name' | 'department' | 'overallAverage' | string;
export type SortDir = 'asc' | 'desc';

interface ResultsListTableProps {
  results: EmployeeResultRow[];
  categories: string[];
  cycleId: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

/** スコアに応じたバッジのvariantを返す */
function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 4.0) return 'default';
  if (score >= 3.0) return 'secondary';
  return 'destructive';
}

/** ソート可能なカラムヘッダー */
function SortableHead({
  label, sortKey, currentKey, currentDir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <TableHead>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <ArrowUpDown className={`size-3 ${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`} />
      </button>
    </TableHead>
  );
}

/** 360度評価結果一覧テーブル */
export function ResultsListTable({
  results, categories, cycleId, sortKey, sortDir, onSort,
}: ResultsListTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="氏名" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
            <SortableHead label="部署" sortKey="department" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
            <TableHead>役職</TableHead>
            <SortableHead label="総合平均" sortKey="overallAverage" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
            {categories.map((cat) => (
              <SortableHead
                key={cat}
                label={cat}
                sortKey={`cat:${cat}`}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
            ))}
            <TableHead>進捗</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.length === 0 && (
            <TableRow>
              <TableCell colSpan={5 + categories.length + 1} className="text-center text-muted-foreground">
                データがありません
              </TableCell>
            </TableRow>
          )}
          {results.map((row) => (
            <TableRow key={row.employeeId}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.department}</TableCell>
              <TableCell>{row.position}</TableCell>
              <TableCell>
                {row.overallAverage > 0 ? (
                  <Badge variant={scoreBadgeVariant(row.overallAverage)}>
                    {row.overallAverage.toFixed(2)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {categories.map((cat) => {
                const val = row.categoryAverages[cat];
                return (
                  <TableCell key={cat}>
                    {val != null && val > 0 ? val.toFixed(2) : '-'}
                  </TableCell>
                );
              })}
              <TableCell>
                <Badge variant={row.submittedAssignments === row.totalAssignments ? 'default' : 'secondary'}>
                  {row.submittedAssignments} / {row.totalAssignments}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/360/${cycleId}/results/${row.employeeId}`}>
                  <Button variant="outline" size="sm">詳細</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
