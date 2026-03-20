import type { PositionGroup } from './types';

export function normalizePositionGroup(position: string): PositionGroup {
  const p = String(position || '').trim();

  if (['担当', 'チーフ', '支店長代理'].includes(p)) return 'groupA';
  if (['支店長', '課長'].includes(p)) return 'groupL';
  if (['支社長', 'ユニットマネージャー'].includes(p)) return 'groupU';
  if (['統括', 'グループマネージャー'].includes(p)) return 'groupG';
  if (['本部長', 'ディビジョンマネージャー'].includes(p)) return 'groupD';

  return 'groupA';
}

function getGradePrefixByPosition(position: string): string {
  const group = normalizePositionGroup(position);
  const prefixMap: Record<PositionGroup, string> = {
    groupA: 'A',
    groupL: 'L',
    groupU: 'U',
    groupG: 'G',
    groupD: 'D',
  };
  return prefixMap[group];
}

interface Threshold {
  grade: number;
  minPoint: number;
}

function getThresholdsByPosition(position: string): Threshold[] {
  const group = normalizePositionGroup(position);

  const map: Record<PositionGroup, Threshold[]> = {
    groupA: [
      { grade: 10, minPoint: 4.55 },
      { grade: 9, minPoint: 4.25 },
      { grade: 8, minPoint: 3.95 },
      { grade: 7, minPoint: 3.65 },
      { grade: 6, minPoint: 3.35 },
      { grade: 5, minPoint: 3.05 },
      { grade: 4, minPoint: 2.75 },
      { grade: 3, minPoint: 2.45 },
      { grade: 2, minPoint: 2.15 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupL: [
      { grade: 10, minPoint: 4.70 },
      { grade: 9, minPoint: 4.40 },
      { grade: 8, minPoint: 4.10 },
      { grade: 7, minPoint: 3.80 },
      { grade: 6, minPoint: 3.50 },
      { grade: 5, minPoint: 3.20 },
      { grade: 4, minPoint: 2.90 },
      { grade: 3, minPoint: 2.60 },
      { grade: 2, minPoint: 2.30 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupU: [
      { grade: 10, minPoint: 4.80 },
      { grade: 9, minPoint: 4.50 },
      { grade: 8, minPoint: 4.20 },
      { grade: 7, minPoint: 3.90 },
      { grade: 6, minPoint: 3.60 },
      { grade: 5, minPoint: 3.30 },
      { grade: 4, minPoint: 3.00 },
      { grade: 3, minPoint: 2.70 },
      { grade: 2, minPoint: 2.40 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupG: [
      { grade: 10, minPoint: 4.87 },
      { grade: 9, minPoint: 4.57 },
      { grade: 8, minPoint: 4.27 },
      { grade: 7, minPoint: 3.97 },
      { grade: 6, minPoint: 3.67 },
      { grade: 5, minPoint: 3.37 },
      { grade: 4, minPoint: 3.07 },
      { grade: 3, minPoint: 2.77 },
      { grade: 2, minPoint: 2.47 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupD: [
      { grade: 10, minPoint: 4.92 },
      { grade: 9, minPoint: 4.62 },
      { grade: 8, minPoint: 4.32 },
      { grade: 7, minPoint: 4.02 },
      { grade: 6, minPoint: 3.72 },
      { grade: 5, minPoint: 3.42 },
      { grade: 4, minPoint: 3.12 },
      { grade: 3, minPoint: 2.82 },
      { grade: 2, minPoint: 2.52 },
      { grade: 1, minPoint: 0.00 },
    ],
  };

  return map[group];
}

export function convertPointToGradeByPosition(position: string, totalPoint: number): number {
  const thresholds = getThresholdsByPosition(position);

  for (const t of thresholds) {
    if (totalPoint >= t.minPoint) {
      return t.grade;
    }
  }

  return 1;
}

export function convertGradeNumberToLabel(position: string, gradeNumber: number): string {
  return getGradePrefixByPosition(position) + String(gradeNumber);
}

export function getGradePay(position: string, grade: number): number {
  const group = normalizePositionGroup(position);

  const payTable: Record<PositionGroup, Record<number, number>> = {
    groupA: { 1: 0, 2: 7000, 3: 14000, 4: 21000, 5: 28000, 6: 35000, 7: 42000, 8: 49000, 9: 56000, 10: 63000 },
    groupL: { 1: 0, 2: 12000, 3: 24000, 4: 36000, 5: 48000, 6: 60000, 7: 72000, 8: 84000, 9: 96000, 10: 108000 },
    groupU: { 1: 0, 2: 15000, 3: 30000, 4: 45000, 5: 60000, 6: 75000, 7: 90000, 8: 105000, 9: 120000, 10: 135000 },
    groupG: { 1: 0, 2: 19000, 3: 38000, 4: 57000, 5: 76000, 6: 95000, 7: 114000, 8: 133000, 9: 152000, 10: 171000 },
    groupD: { 1: 0, 2: 23000, 3: 46000, 4: 69000, 5: 92000, 6: 115000, 7: 138000, 8: 161000, 9: 184000, 10: 207000 },
  };

  return payTable[group][grade] || 0;
}
