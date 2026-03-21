'use client';

import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MissionRow, PersonSummary } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface PersonTableProps {
  missions: MissionRow[];
}

function buildPersonSummaries(missions: MissionRow[]): PersonSummary[] {
  const map = new Map<string, MissionRow[]>();

  for (const m of missions) {
    const key = m.aggregationKey || `${m.period}_${m.name}_${m.position}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  const summaries: PersonSummary[] = [];

  for (const [key, rows] of map) {
    const first = rows[0];
    summaries.push({
      aggregationKey: key,
      period: first.period,
      name: first.name,
      department: first.department,
      position: first.position,
      missionCount: rows.length,
      totalPoint: first.totalPoint || 0,
      finalGradeLabel: first.finalGradeLabel || '-',
      finalGradePay: first.finalGradePay || 0,
      status: first.status || '未採点',
    });
  }

  return summaries;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === '集計完了') return 'default';
  if (status === 'AI採点完了') return 'secondary';
  if (status === 'AIエラー') return 'destructive';
  return 'outline';
}

export function PersonTable({ missions }: PersonTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const summaries = buildPersonSummaries(missions);

  function getMissionsForKey(key: string): MissionRow[] {
    return missions.filter(m => (m.aggregationKey || `${m.period}_${m.name}_${m.position}`) === key);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>期間</TableHead>
          <TableHead>氏名</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>役職</TableHead>
          <TableHead className="text-center">ミッション数</TableHead>
          <TableHead className="text-right">総合ポイント</TableHead>
          <TableHead>グレード</TableHead>
          <TableHead className="text-right">グレード給</TableHead>
          <TableHead>ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
              データがありません
            </TableCell>
          </TableRow>
        ) : (
          summaries.map(person => (
            <Fragment key={person.aggregationKey}>
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedKey(
                  expandedKey === person.aggregationKey ? null : person.aggregationKey
                )}
              >
                <TableCell>{person.period}</TableCell>
                <TableCell className="font-medium">{person.name}</TableCell>
                <TableCell>{person.department}</TableCell>
                <TableCell>{person.position}</TableCell>
                <TableCell className="text-center">{person.missionCount}</TableCell>
                <TableCell className="text-right">{person.totalPoint || '-'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{person.finalGradeLabel}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {person.finalGradePay ? formatCurrency(person.finalGradePay) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(person.status)}>{person.status}</Badge>
                </TableCell>
              </TableRow>

              {expandedKey === person.aggregationKey && (
                <TableRow key={`${person.aggregationKey}-detail`}>
                  <TableCell colSpan={9} className="bg-muted/30 p-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">ミッション詳細</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>ミッション名</TableHead>
                            <TableHead className="text-center">ウェイト</TableHead>
                            <TableHead className="text-center">難易度</TableHead>
                            <TableHead className="text-center">影響範囲</TableHead>
                            <TableHead className="text-center">新規性</TableHead>
                            <TableHead className="text-center">課題寄与</TableHead>
                            <TableHead className="text-center">立ち位置</TableHead>
                            <TableHead className="text-center">実現可能性</TableHead>
                            <TableHead className="text-right">加重ポイント</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getMissionsForKey(person.aggregationKey).map(m => (
                            <TableRow key={m.rowNumber}>
                              <TableCell>{m.missionNo}</TableCell>
                              <TableCell>{m.m1_missionName}</TableCell>
                              <TableCell className="text-center">{m.weight}%</TableCell>
                              <TableCell className="text-center">{m.difficulty ?? '-'}</TableCell>
                              <TableCell className="text-center">{m.scope ?? '-'}</TableCell>
                              <TableCell className="text-center">{m.innovation ?? '-'}</TableCell>
                              <TableCell className="text-center">{m.contribution ?? '-'}</TableCell>
                              <TableCell className="text-center">{m.roleLevel ?? '-'}</TableCell>
                              <TableCell className="text-center">{m.feasibility ?? '-'}</TableCell>
                              <TableCell className="text-right">{m.missionWeightedPoint ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))
        )}
      </TableBody>
    </Table>
  );
}
