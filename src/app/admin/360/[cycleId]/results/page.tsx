'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { EmployeeResultRow } from '@/lib/360-result-aggregation';
import type { Eval360Dimension } from '@/lib/types';
import { ResultsListFilters } from '@/components/360/results-list-filters';
import { ResultsListTable, type SortKey, type SortDir } from '@/components/360/results-list-table';
import { ResultsCsvExport } from '@/components/360/results-csv-export';

interface ApiResponse {
  success: boolean;
  cycleName: string;
  dimensions: Eval360Dimension[];
  results: EmployeeResultRow[];
}

export default function ResultsOverviewPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // フィルター状態
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ソート状態
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/360/cycles/${cycleId}/results`);
      const json = await res.json();
      if (json.success) setData(json as ApiResponse);
      setLoading(false);
    }
    load();
  }, [cycleId]);

  // カテゴリ一覧を抽出（重複排除・順序保持）
  const categories = useMemo(() => {
    if (!data) return [];
    const cats: string[] = [];
    for (const dim of data.dimensions) {
      const cat = dim.category || '未分類';
      if (!cats.includes(cat)) cats.push(cat);
    }
    return cats;
  }, [data]);

  // 部署一覧
  const departments = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.results.map((r) => r.department));
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [data]);

  // フィルタリング＆ソート適用
  const filteredResults = useMemo(() => {
    if (!data) return [];
    let results = data.results;

    // 部署フィルタ
    if (selectedDepartment !== 'all') {
      results = results.filter((r) => r.department === selectedDepartment);
    }
    // 氏名検索
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      results = results.filter((r) => r.name.toLowerCase().includes(q));
    }
    // ソート
    results = [...results].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const valA = getSortValue(a, sortKey);
      const valB = getSortValue(b, sortKey);
      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB, 'ja') * dir;
      }
      return ((valA as number) - (valB as number)) * dir;
    });

    return results;
  }, [data, selectedDepartment, searchText, sortKey, sortDir]);

  // ソートトグル
  const handleSort = useCallback((key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/admin/360/${cycleId}`} className="text-sm text-muted-foreground hover:underline">
          ← サイクル詳細
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          360度評価 結果一覧
          {data && <span className="text-lg font-normal text-muted-foreground ml-2">({data.cycleName})</span>}
        </h1>
        {data && <ResultsCsvExport cycleId={cycleId} cycleName={data.cycleName} />}
      </div>

      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : !data ? (
        <p className="text-muted-foreground">データの取得に失敗しました</p>
      ) : (
        <>
          <div className="mb-4">
            <ResultsListFilters
              departments={departments}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
              searchText={searchText}
              onSearchTextChange={setSearchText}
            />
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {filteredResults.length}件表示 / 全{data.results.length}件
          </p>

          <ResultsListTable
            results={filteredResults}
            categories={categories}
            cycleId={cycleId}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </>
      )}
    </div>
  );
}

/** ソートキーに対応する値を取得 */
function getSortValue(row: EmployeeResultRow, key: SortKey): string | number {
  if (key === 'name') return row.name;
  if (key === 'department') return row.department;
  if (key === 'overallAverage') return row.overallAverage;
  // カテゴリ別ソート（"cat:カテゴリ名" 形式）
  if (key.startsWith('cat:')) {
    const cat = key.slice(4);
    return row.categoryAverages[cat] ?? 0;
  }
  return row.name;
}
