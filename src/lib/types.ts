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
  advice?: string;
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

// 360-degree evaluation types
export type EvaluationRelationship = '上司' | '同僚' | '部下' | '本人';
export type CycleStatus = 'draft' | 'open' | 'closed';
export type AssignmentStatus = 'pending' | 'submitted';

export interface Eval360Dimension {
  key: string;
  label: string;
  description: string;
  groups: string[]; // ['all'] or ['A','L'] etc.
}

export interface Eval360AssignmentRow {
  evaluateeNumber: string;
  evaluatorNumber: string;
  relationship: EvaluationRelationship;
}

export interface Eval360Scores {
  [dimensionKey: string]: number; // 1-5
}

export interface Eval360AssignmentView {
  id: string;
  evaluateeName: string;
  evaluateeDepartment: string;
  relationship: EvaluationRelationship;
  status: AssignmentStatus;
}

export interface Eval360CategoryResult {
  relationship: EvaluationRelationship;
  responseCount: number;
  averageScores: Record<string, number>;
  comments: string[];
}

export interface Eval360ResultView {
  evaluateeName: string;
  cycleName: string;
  categories: Eval360CategoryResult[];
  overallAverages: Record<string, number>;
}

// Auth types
export type UserRole = 'admin' | 'manager' | 'employee';

export interface SessionPayload {
  sessionId: string;
  userId: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
  employeeId?: string;
  employeeName?: string;
}
