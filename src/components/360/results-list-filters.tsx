'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ResultsListFiltersProps {
  departments: string[];
  selectedDepartment: string;
  onDepartmentChange: (value: string) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
}

/** 360度評価結果一覧のフィルターバー */
export function ResultsListFilters({
  departments,
  selectedDepartment,
  onDepartmentChange,
  searchText,
  onSearchTextChange,
}: ResultsListFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4">
      {/* 部署フィルタ */}
      <Select value={selectedDepartment} onValueChange={(v) => onDepartmentChange(v ?? 'all')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="部署で絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての部署</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 氏名検索 */}
      <Input
        type="text"
        placeholder="氏名で検索..."
        value={searchText}
        onChange={(e) => onSearchTextChange(e.target.value)}
        className="w-full sm:w-[200px]"
      />
    </div>
  );
}
