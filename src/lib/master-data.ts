import type { MasterData, PositionGroup, GradeResult } from './types';
import { getMasterData } from './google-sheets';
import {
  normalizePositionGroup,
  convertPointToGradeByPosition,
  convertGradeNumberToLabel,
  getGradePay,
} from './aggregation';

// 5-minute cache
let cachedData: MasterData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadMasterData(): Promise<MasterData | null> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  const data = await getMasterData();
  if (data) {
    cachedData = data;
    cacheTimestamp = now;
  }
  return data;
}

function resolvePositionGroup(masterData: MasterData, position: string): PositionGroup {
  const p = position.trim();
  const mapping = masterData.positionMappings.find(m => m.position === p);
  return mapping ? mapping.group : 'groupA';
}

function groupToPrefix(group: PositionGroup): string {
  return group.replace('group', '');
}

function resolveGradeFromMaster(masterData: MasterData, position: string, totalPoint: number): GradeResult {
  const group = resolvePositionGroup(masterData, position);
  const prefix = groupToPrefix(group);

  // Filter and sort thresholds for this group (descending by gradeNumber)
  const thresholds = masterData.thresholds
    .filter(t => t.group === group)
    .sort((a, b) => b.gradeNumber - a.gradeNumber);

  let gradeNumber = 1;
  for (const t of thresholds) {
    if (totalPoint >= t.minPoint) {
      gradeNumber = t.gradeNumber;
      break;
    }
  }

  const gradeLabel = prefix + String(gradeNumber);

  // Find pay
  const payEntry = masterData.gradePay.find(
    p => p.group === group && p.gradeNumber === gradeNumber
  );
  const gradePay = payEntry ? payEntry.amount : 0;

  return { gradeNumber, gradeLabel, gradePay };
}

export async function resolveGrade(position: string, totalPoint: number): Promise<GradeResult> {
  const masterData = await loadMasterData();

  if (masterData) {
    return resolveGradeFromMaster(masterData, position, totalPoint);
  }

  // Fallback to hardcoded values
  const gradeNumber = convertPointToGradeByPosition(position, totalPoint);
  const gradeLabel = convertGradeNumberToLabel(position, gradeNumber);
  const pay = getGradePay(position, gradeNumber);
  return { gradeNumber, gradeLabel, gradePay: pay };
}
