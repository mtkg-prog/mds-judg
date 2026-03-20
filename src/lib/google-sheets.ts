import { google } from 'googleapis';
import type { MissionRow, PositionMapping, GradeThreshold, GradePayEntry, MasterData, PositionGroup } from './types';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account の認証情報が設定されていません。');
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID が設定されていません。');
  return id;
}

function parseRow(row: string[], rowNumber: number): MissionRow {
  return {
    rowNumber,
    period: row[0] || '',
    name: row[1] || '',
    department: row[2] || '',
    currentGrade: row[3] || '',
    position: row[4] || '',
    missionNo: Number(row[5]) || 0,
    weight: Number(row[6]) || 0,
    m1_missionName: row[7] || '',
    m2_backgroundGoal: row[8] || '',
    m3_contentDifficulty: row[9] || '',
    m4_stakeholdersRole: row[10] || '',
    m5_feasibilityEvidence: row[11] || '',
    difficulty: row[12] ? Number(row[12]) : undefined,
    scope: row[13] ? Number(row[13]) : undefined,
    innovation: row[14] ? Number(row[14]) : undefined,
    contribution: row[15] ? Number(row[15]) : undefined,
    roleLevel: row[16] ? Number(row[16]) : undefined,
    feasibility: row[17] ? Number(row[17]) : undefined,
    aiComment: row[18] || undefined,
    missionWeightedPoint: row[19] ? Number(row[19]) : undefined,
    gradeLabel: row[20] || undefined,
    gradePay: row[21] ? Number(row[21]) : undefined,
    judgmentDatetime: row[22] || undefined,
    status: row[23] || undefined,
    aggregationKey: row[24] || undefined,
    totalPoint: row[25] ? Number(row[25]) : undefined,
    finalGradeLabel: row[26] || undefined,
    finalGradePay: row[27] ? Number(row[27]) : undefined,
  };
}

const GROUP_LETTER_MAP: Record<string, PositionGroup> = {
  A: 'groupA', L: 'groupL', U: 'groupU', G: 'groupG', D: 'groupD',
};

function parseGroupLetter(letter: string): PositionGroup {
  return GROUP_LETTER_MAP[letter.trim().toUpperCase()] || 'groupA';
}

export async function getPositionMappings(): Promise<PositionMapping[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: 'master!A2:B',
  });
  return (res.data.values || [])
    .filter(row => row[0]?.trim())
    .map(row => ({
      position: row[0].trim(),
      group: parseGroupLetter(row[1] || 'A'),
    }));
}

export async function getGradeThresholds(): Promise<GradeThreshold[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: 'master!D2:F',
  });
  return (res.data.values || [])
    .filter(row => row[0]?.trim() && row[1]?.trim())
    .map(row => {
      const label = row[1].trim();
      const num = parseInt(label.replace(/[^0-9]/g, ''), 10) || 1;
      return {
        group: parseGroupLetter(row[0]),
        gradeLabel: label,
        gradeNumber: num,
        minPoint: parseFloat(row[2]) || 0,
      };
    });
}

export async function getGradePayTable(): Promise<GradePayEntry[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: 'master!H2:I',
  });
  return (res.data.values || [])
    .filter(row => row[0]?.trim())
    .map(row => {
      const label = row[0].trim();
      const letter = label.replace(/[0-9]/g, '');
      const num = parseInt(label.replace(/[^0-9]/g, ''), 10) || 1;
      return {
        gradeLabel: label,
        gradeNumber: num,
        group: parseGroupLetter(letter),
        amount: parseInt(row[1]) || 0,
      };
    });
}

export async function getMasterData(): Promise<MasterData | null> {
  try {
    const [positionMappings, thresholds, gradePay] = await Promise.all([
      getPositionMappings(),
      getGradeThresholds(),
      getGradePayTable(),
    ]);
    if (positionMappings.length === 0 && thresholds.length === 0 && gradePay.length === 0) {
      return null;
    }
    return { positionMappings, thresholds, gradePay };
  } catch {
    return null;
  }
}

export async function getAllMissions(): Promise<MissionRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'missions!A2:AB',
  });

  const rows = response.data.values || [];

  return rows
    .map((row, index) => parseRow(row as string[], index + 2))
    .filter(row => row.m1_missionName.trim() !== '');
}
