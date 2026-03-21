'use client';

import { useEffect, useState, useMemo } from 'react';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { Filters } from '@/components/dashboard/filters';
import { PersonTable } from '@/components/dashboard/person-table';
import { Skeleton } from '@/components/ui/skeleton';
import type { MissionRow } from '@/lib/types';

export default function DashboardPage() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [nameQuery, setNameQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/missions');
        const json = await res.json();
        if (json.success) {
          if (json.notConfigured) {
            setNotConfigured(true);
          }
          setMissions(json.data);
        } else {
          setError(json.error);
        }
      } catch (e) {
        setError(`データの取得に失敗しました: ${e}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const periods = useMemo(() => [...new Set(missions.map(m => m.period))].sort(), [missions]);
  const departments = useMemo(() => [...new Set(missions.map(m => m.department))].sort(), [missions]);

  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      if (selectedPeriod !== 'all' && m.period !== selectedPeriod) return false;
      if (selectedDepartment !== 'all' && m.department !== selectedDepartment) return false;
      if (nameQuery && !m.name.includes(nameQuery)) return false;
      return true;
    });
  }, [missions, selectedPeriod, selectedDepartment, nameQuery]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">データの取得に失敗しました</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2 text-muted-foreground">
            Google Sheets API の設定を確認してください。Service Account の認証情報が .env.local に正しく設定されていることを確認してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">スプレッドシートの評価データを閲覧</p>
      </div>

      {notConfigured && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <p className="font-medium">Google Sheets API が未設定です</p>
          <p className="text-sm mt-1">
            ダッシュボードを利用するには、Vercelの環境変数にGoogle Service Accountの認証情報を設定してください。
            セルフチェック機能は上部の「セルフチェック」からご利用いただけます。
          </p>
        </div>
      )}

      <StatsCards missions={filteredMissions} />

      <Filters
        periods={periods}
        departments={departments}
        selectedPeriod={selectedPeriod}
        selectedDepartment={selectedDepartment}
        nameQuery={nameQuery}
        onPeriodChange={(v) => setSelectedPeriod(v ?? 'all')}
        onDepartmentChange={(v) => setSelectedDepartment(v ?? 'all')}
        onNameChange={setNameQuery}
      />

      <PersonTable missions={filteredMissions} />
    </div>
  );
}
