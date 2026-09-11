import type { MissionInput } from './types';

// コンテンツ品質バリデーション
// フィラー文字（●、！等）による文字数稼ぎを3段階で検出する

/** 有意文字パターン（ひらがな・カタカナ・漢字・英数字） */
const MEANINGFUL_CHARS_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Letter}\p{Number}]/gu;

/** 同一文字の5回以上連続繰り返し */
const REPEATED_CHAR_RE = /(.)\1{4,}/gu;

/** 採点不可ライン（70%未満） */
const ERROR_RATIO = 0.7;

/** 注意ライン（85%未満） */
const WARNING_RATIO = 0.85;

/** 連続繰り返し文字が占める割合の上限（50%） */
const MAX_REPEATED_RATIO = 0.5;

/** 品質レベル: ok=正常, warning=注意付き採点, error=採点不可 */
export type ContentQualityLevel = 'ok' | 'warning' | 'error';

export interface ContentValidationResult {
  level: ContentQualityLevel;
  meaningfulRatio: number;
  warningMessage?: string;
  errorMessage?: string;
}

/**
 * 単一テキストフィールドの内容品質を3段階でチェック
 * - ok: 有意文字率85%以上（正常）
 * - warning: 70〜85%（注意書き付きで採点続行）
 * - error: 70%未満（採点不可）
 */
export function validateContentQuality(text: string, fieldLabel: string): ContentValidationResult {
  if (!text || text.length === 0) {
    return { level: 'ok', meaningfulRatio: 0 };
  }

  // 有意文字率の算出
  const meaningfulMatches = text.match(MEANINGFUL_CHARS_RE);
  const meaningfulCount = meaningfulMatches ? meaningfulMatches.length : 0;
  const meaningfulRatio = meaningfulCount / text.length;

  // 採点不可（70%未満）
  if (meaningfulRatio < ERROR_RATIO) {
    return {
      level: 'error',
      meaningfulRatio,
      errorMessage: `${fieldLabel}は記号が多すぎるため採点できません。具体的な内容で再入力してください。`,
    };
  }

  // 同一文字の連続繰り返しチェック（エラー扱い）
  const repeatedMatches = text.match(REPEATED_CHAR_RE);
  if (repeatedMatches) {
    const repeatedTotal = repeatedMatches.reduce((sum, m) => sum + m.length, 0);
    if (repeatedTotal / text.length > MAX_REPEATED_RATIO) {
      return {
        level: 'error',
        meaningfulRatio,
        errorMessage: `${fieldLabel}に同じ文字の繰り返しが多く含まれています。具体的な内容を記述してください。`,
      };
    }
  }

  // 注意（70〜85%）
  if (meaningfulRatio < WARNING_RATIO) {
    return {
      level: 'warning',
      meaningfulRatio,
      warningMessage: `${fieldLabel}に記号や伏せ字が多く含まれています。AI採点の精度が低下する可能性があります。実際のMDS提出時には具体的な内容を記述してください。`,
    };
  }

  return { level: 'ok', meaningfulRatio };
}

/** フィールドラベルのマッピング */
const FIELD_LABELS: Record<string, string> = {
  m1_missionName: 'M1（ミッション名）',
  m2_backgroundGoal: 'M2（背景・課題と1年後のゴール）',
  m3_contentDifficulty: 'M3（ミッションの内容や難易度）',
  m4_stakeholdersRole: 'M4（関係先・巻き込む相手・自分の役割）',
  m5_feasibilityEvidence: 'M5（ミッション完遂の根拠）',
};

/**
 * MissionInput全体の内容品質をチェック
 * 全M1〜M5フィールドを検証し、最も悪いレベルを返す
 */
export function validateMissionContentQuality(mission: MissionInput): ContentValidationResult {
  const fields: (keyof MissionInput)[] = [
    'm1_missionName',
    'm2_backgroundGoal',
    'm3_contentDifficulty',
    'm4_stakeholdersRole',
    'm5_feasibilityEvidence',
  ];

  let worstResult: ContentValidationResult = { level: 'ok', meaningfulRatio: 1 };

  for (const field of fields) {
    const value = mission[field];
    if (typeof value !== 'string') continue;

    const label = FIELD_LABELS[field] || field;
    const result = validateContentQuality(value, label);

    // errorが見つかったら即座に返す
    if (result.level === 'error') return result;

    // warningを記録（最初のwarningを保持）
    if (result.level === 'warning' && worstResult.level === 'ok') {
      worstResult = result;
    }
  }

  return worstResult;
}
