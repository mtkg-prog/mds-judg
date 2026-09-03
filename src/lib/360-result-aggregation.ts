/**
 * 360度評価 結果集計ロジック
 * 全従業員分のレスポンスを一括集計する共通関数
 */

// 従業員別の結果行（一覧表示用）
export interface EmployeeResultRow {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  overallAverage: number;
  dimensionAverages: Record<string, number>;
  categoryAverages: Record<string, number>;
  responseCount: number;
  totalAssignments: number;
  submittedAssignments: number;
}

// Prismaから取得したレスポンスの型
interface ResponseRecord {
  evaluateeId: string;
  relationship: string;
  scores: string;
}

// 従業員情報の型
interface EmployeeInfo {
  id: string;
  name: string;
  department: string;
  position: string;
}

// ディメンションとカテゴリの対応
interface DimensionCategoryMap {
  [dimensionKey: string]: string; // key → category名
}

/**
 * レスポンス群を従業員別に集計する
 * - 自己評価（本人）は集計対象外
 * - スコア0（判断できない）は平均計算から除外
 * - 結果は小数点2桁に丸める
 */
export function aggregateResponsesByEmployee(
  responses: ResponseRecord[],
  employeeMap: Map<string, EmployeeInfo>,
  assignmentCounts: Map<string, { total: number; submitted: number }>,
  dimensionCategoryMap: DimensionCategoryMap
): EmployeeResultRow[] {
  // 従業員ごとにレスポンスをグループ化
  const grouped = new Map<string, ResponseRecord[]>();
  for (const r of responses) {
    // 自己評価を除外
    if (r.relationship === '本人') continue;
    const list = grouped.get(r.evaluateeId) || [];
    list.push(r);
    grouped.set(r.evaluateeId, list);
  }

  const results: EmployeeResultRow[] = [];

  // 割当がある全従業員を対象にする（回答0件でも表示）
  const allEmployeeIds = new Set([
    ...grouped.keys(),
    ...assignmentCounts.keys(),
  ]);

  for (const empId of allEmployeeIds) {
    const emp = employeeMap.get(empId);
    if (!emp) continue;

    const empResponses = grouped.get(empId) || [];
    const counts = assignmentCounts.get(empId) || { total: 0, submitted: 0 };

    // ディメンション別の合計・件数
    const dimSums: Record<string, number> = {};
    const dimCounts: Record<string, number> = {};

    for (const r of empResponses) {
      const parsed = JSON.parse(r.scores) as Record<string, number>;
      for (const [key, val] of Object.entries(parsed)) {
        if (val === 0) continue; // 「判断できない」は除外
        dimSums[key] = (dimSums[key] || 0) + val;
        dimCounts[key] = (dimCounts[key] || 0) + 1;
      }
    }

    // ディメンション別平均
    const dimensionAverages: Record<string, number> = {};
    for (const key of Object.keys(dimSums)) {
      dimensionAverages[key] = round2(dimSums[key] / dimCounts[key]);
    }

    // カテゴリ別平均（ディメンション平均の平均）
    const categoryAverages = computeCategoryAverages(dimensionAverages, dimensionCategoryMap);

    // 総合平均（全ディメンション平均の平均）
    const dimValues = Object.values(dimensionAverages);
    const overallAverage = dimValues.length > 0
      ? round2(dimValues.reduce((a, b) => a + b, 0) / dimValues.length)
      : 0;

    results.push({
      employeeId: empId,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      overallAverage,
      dimensionAverages,
      categoryAverages,
      responseCount: empResponses.length,
      totalAssignments: counts.total,
      submittedAssignments: counts.submitted,
    });
  }

  // 氏名順でソート
  results.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return results;
}

/** カテゴリ別平均を算出（同カテゴリのディメンション平均の平均） */
function computeCategoryAverages(
  dimensionAverages: Record<string, number>,
  dimensionCategoryMap: DimensionCategoryMap
): Record<string, number> {
  const catSums: Record<string, number> = {};
  const catCounts: Record<string, number> = {};

  for (const [dimKey, avg] of Object.entries(dimensionAverages)) {
    const category = dimensionCategoryMap[dimKey] || '未分類';
    catSums[category] = (catSums[category] || 0) + avg;
    catCounts[category] = (catCounts[category] || 0) + 1;
  }

  const result: Record<string, number> = {};
  for (const cat of Object.keys(catSums)) {
    result[cat] = round2(catSums[cat] / catCounts[cat]);
  }
  return result;
}

/** 小数点2桁に丸める */
function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
