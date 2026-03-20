export type PositionGroup = 'groupA' | 'groupL' | 'groupU' | 'groupG' | 'groupD';

export const POSITIONS = [
  '担当', 'チーフ', '支店長代理',
  '支店長', '課長',
  '支社長', 'ユニットマネージャー',
  '統括', 'グループマネージャー',
  '本部長', 'ディビジョンマネージャー',
] as const;

export type Position = typeof POSITIONS[number];

export interface MissionInput {
  weight: number;
  m1_missionName: string;
  m2_backgroundGoal: string;
  m3_contentDifficulty: string;
  m4_stakeholdersRole: string;
  m5_feasibilityEvidence: string;
}

export interface AIScoreResult {
  difficulty: number;
  scope: number;
  innovation: number;
  contribution: number;
  roleLevel: number;
  feasibility: number;
  comment: string;
}

export interface ScoringRequest {
  position: string;
  mission: MissionInput;
}

export interface ScoringResponse {
  success: boolean;
  scores?: AIScoreResult;
  missionWeightedPoint?: number;
  error?: string;
}

export interface MissionWithScore {
  input: MissionInput;
  scores?: AIScoreResult;
  missionWeightedPoint?: number;
}

export interface CheckResult {
  missions: MissionWithScore[];
  totalPoint: number;
  gradeNumber: number;
  gradeLabel: string;
  gradePay: number;
}

// Master data types (from spreadsheet master sheet)
export interface PositionMapping {
  position: string;
  group: PositionGroup;
}

export interface GradeThreshold {
  group: PositionGroup;
  gradeLabel: string;
  gradeNumber: number;
  minPoint: number;
}

export interface GradePayEntry {
  gradeLabel: string;
  gradeNumber: number;
  group: PositionGroup;
  amount: number;
}

export interface MasterData {
  positionMappings: PositionMapping[];
  thresholds: GradeThreshold[];
  gradePay: GradePayEntry[];
}

export interface GradeResult {
  gradeNumber: number;
  gradeLabel: string;
  gradePay: number;
}

// Dashboard types (from spreadsheet)
export interface MissionRow {
  rowNumber: number;
  period: string;
  name: string;
  department: string;
  currentGrade: string;
  position: string;
  missionNo: number;
  weight: number;
  m1_missionName: string;
  m2_backgroundGoal: string;
  m3_contentDifficulty: string;
  m4_stakeholdersRole: string;
  m5_feasibilityEvidence: string;
  difficulty?: number;
  scope?: number;
  innovation?: number;
  contribution?: number;
  roleLevel?: number;
  feasibility?: number;
  aiComment?: string;
  missionWeightedPoint?: number;
  gradeLabel?: string;
  gradePay?: number;
  judgmentDatetime?: string;
  status?: string;
  aggregationKey?: string;
  totalPoint?: number;
  finalGradeLabel?: string;
  finalGradePay?: number;
}

export interface PersonSummary {
  aggregationKey: string;
  period: string;
  name: string;
  department: string;
  position: string;
  missionCount: number;
  totalPoint: number;
  finalGradeLabel: string;
  finalGradePay: number;
  status: string;
}
