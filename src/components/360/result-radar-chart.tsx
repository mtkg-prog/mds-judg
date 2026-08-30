'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Eval360ResultView, Eval360Dimension, EvaluationRelationship } from '@/lib/types';

interface ResultRadarChartProps {
  result: Eval360ResultView;
  dimensions: Eval360Dimension[];
  showDetail?: boolean; // false: 全体平均のみ表示
}

const SERIES: { key: EvaluationRelationship; color: string }[] = [
  { key: '上司', color: '#3b82f6' },
  { key: '同僚', color: '#22c55e' },
  { key: '部下', color: '#f97316' },
];

const relationshipLabel: Record<string, string> = {
  '上司': '上司',
  '同僚': '同僚',
  '部下': '部下',
};

export function ResultRadarChart({ result, dimensions, showDetail = true }: ResultRadarChartProps) {
  const categoryMap = new Map(result.categories.map((c) => [c.relationship, c]));

  if (showDetail) {
    // 管理者向け: 関係別の複数ライン表示
    const presentSeries = SERIES.filter((s) => categoryMap.has(s.key));

    if (presentSeries.length === 0 && Object.keys(result.overallAverages).length === 0) return null;

    const radarData = dimensions.map((dim) => {
      const entry: Record<string, string | number> = { dimension: dim.label };
      for (const s of presentSeries) {
        const cat = categoryMap.get(s.key);
        entry[s.key] = cat?.averageScores[dim.key] ?? 0;
      }
      return entry;
    });

    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">評価比較レーダーチャート</h3>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
            {presentSeries.map((s) => (
              <Radar
                key={s.key}
                name={relationshipLabel[s.key] ?? s.key}
                dataKey={s.key}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.1}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 従業員向け: 全体平均のみの単一ライン表示
  if (Object.keys(result.overallAverages).length === 0) return null;

  const radarData = dimensions.map((dim) => ({
    dimension: dim.label,
    score: result.overallAverages[dim.key] ?? 0,
  }));

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3">評価レーダーチャート</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
          <Radar
            name="総合平均"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
