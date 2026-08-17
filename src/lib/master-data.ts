import type { MasterData, PositionGroup, GradeResult, Eval360Dimension, Eval360AssignmentRow } from './types';
import { getMasterData, get360EvalDimensions, get360Assignments } from './google-sheets';
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

// 360度評価項目のシート名別キャッシュ
const dimensionCache = new Map<string, { dims: Eval360Dimension[]; timestamp: number }>();

export async function load360Dimensions(sheetName: string = '360eval'): Promise<Eval360Dimension[]> {
  const now = Date.now();
  const entry = dimensionCache.get(sheetName);
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.dims;
  }

  try {
    const dims = await get360EvalDimensions(sheetName);
    if (dims.length > 0) {
      dimensionCache.set(sheetName, { dims, timestamp: now });
    }
    return dims;
  } catch {
    return entry?.dims || [];
  }
}

// 360 assignments cache
let cached360Assignments: Eval360AssignmentRow[] | null = null;
let cache360AssignTimestamp = 0;

export async function load360Assignments(): Promise<Eval360AssignmentRow[]> {
  const now = Date.now();
  if (cached360Assignments && now - cache360AssignTimestamp < CACHE_TTL_MS) {
    return cached360Assignments;
  }

  try {
    const rows = await get360Assignments();
    if (rows.length > 0) {
      cached360Assignments = rows;
      cache360AssignTimestamp = now;
    }
    return rows;
  } catch (e) {
    console.error('360assignシートの読み込みエラー:', e);
    if (cached360Assignments) return cached360Assignments;
    throw new Error(`360assignシートの読み込みに失敗しました: ${e instanceof Error ? e.message : e}`);
  }
}

export async function load360DimensionsForGroup(group: PositionGroup, sheetName?: string): Promise<Eval360Dimension[]> {
  const allDims = await load360Dimensions(sheetName);
  const groupLetter = groupToPrefix(group);
  return allDims.filter(
    (dim) => dim.groups.includes('all') || dim.groups.includes(groupLetter)
  );
}

export async function resolvePositionGroupByPosition(position: string): Promise<PositionGroup> {
  const masterData = await loadMasterData();
  if (masterData) {
    return resolvePositionGroup(masterData, position);
  }
  return 'groupA';
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
