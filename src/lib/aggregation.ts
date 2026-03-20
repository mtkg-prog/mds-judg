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
      { grade: 10, minPoint: 9.10 },
      { grade: 9, minPoint: 8.50 },
      { grade: 8, minPoint: 7.90 },
      { grade: 7, minPoint: 7.30 },
      { grade: 6, minPoint: 6.70 },
      { grade: 5, minPoint: 6.10 },
      { grade: 4, minPoint: 5.50 },
      { grade: 3, minPoint: 4.90 },
      { grade: 2, minPoint: 4.30 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupL: [
      { grade: 10, minPoint: 9.40 },
      { grade: 9, minPoint: 8.80 },
      { grade: 8, minPoint: 8.20 },
      { grade: 7, minPoint: 7.60 },
      { grade: 6, minPoint: 7.00 },
      { grade: 5, minPoint: 6.40 },
      { grade: 4, minPoint: 5.80 },
      { grade: 3, minPoint: 5.20 },
      { grade: 2, minPoint: 4.60 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupU: [
      { grade: 10, minPoint: 9.60 },
      { grade: 9, minPoint: 9.00 },
      { grade: 8, minPoint: 8.40 },
      { grade: 7, minPoint: 7.80 },
      { grade: 6, minPoint: 7.20 },
      { grade: 5, minPoint: 6.60 },
      { grade: 4, minPoint: 6.00 },
      { grade: 3, minPoint: 5.40 },
      { grade: 2, minPoint: 4.80 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupG: [
      { grade: 10, minPoint: 9.74 },
      { grade: 9, minPoint: 9.14 },
      { grade: 8, minPoint: 8.54 },
      { grade: 7, minPoint: 7.94 },
      { grade: 6, minPoint: 7.34 },
      { grade: 5, minPoint: 6.74 },
      { grade: 4, minPoint: 6.14 },
      { grade: 3, minPoint: 5.54 },
      { grade: 2, minPoint: 4.94 },
      { grade: 1, minPoint: 0.00 },
    ],
    groupD: [
      { grade: 10, minPoint: 9.84 },
      { grade: 9, minPoint: 9.24 },
      { grade: 8, minPoint: 8.64 },
      { grade: 7, minPoint: 8.04 },
      { grade: 6, minPoint: 7.44 },
      { grade: 5, minPoint: 6.84 },
      { grade: 4, minPoint: 6.24 },
      { grade: 3, minPoint: 5.64 },
      { grade: 2, minPoint: 5.04 },
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
