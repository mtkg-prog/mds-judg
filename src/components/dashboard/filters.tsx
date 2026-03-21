'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FiltersProps {
  periods: string[];
  departments: string[];
  selectedPeriod: string;
  selectedDepartment: string;
  nameQuery: string;
  onPeriodChange: (v: string | null) => void;
  onDepartmentChange: (v: string | null) => void;
  onNameChange: (v: string) => void;
}

export function Filters({
  periods,
  departments,
  selectedPeriod,
  selectedDepartment,
  nameQuery,
  onPeriodChange,
  onDepartmentChange,
  onNameChange,
}: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4">
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="期間で絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての期間</SelectItem>
          {periods.map(p => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedDepartment} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="部署で絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての部署</SelectItem>
          {departments.map(d => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="氏名で検索"
        value={nameQuery}
        onChange={e => onNameChange(e.target.value)}
        className="w-full sm:w-[200px]"
      />
    </div>
  );
}
