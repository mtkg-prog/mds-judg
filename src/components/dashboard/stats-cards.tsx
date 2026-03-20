'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MissionRow } from '@/lib/types';

interface StatsCardsProps {
  missions: MissionRow[];
}

export function StatsCards({ missions }: StatsCardsProps) {
  const total = missions.length;
  const scored = missions.filter(m => m.status === 'AI採点完了' || m.status === '集計完了').length;
  const aggregated = missions.filter(m => m.status === '集計完了').length;
  const uniquePersons = new Set(missions.map(m => `${m.period}_${m.name}_${m.position}`)).size;

  const stats = [
    { label: '総ミッション数', value: total },
    { label: '採点済み', value: scored },
    { label: '集計済み', value: aggregated },
    { label: '対象者数', value: uniquePersons },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
