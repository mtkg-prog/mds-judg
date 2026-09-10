import type { MissionInput } from './types';

// コンテンツ品質バリデーション
// フィラー文字（●、！等）による文字数稼ぎを検出し、AI採点前にブロックする

/** 有意文字パターン（ひらがな・カタカナ・漢字・英数字） */
const MEANINGFUL_CHARS_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{Letter}\p{Number}]/gu;

/** 同一文字の5回以上連続繰り返し */
const REPEATED_CHAR_RE = /(.)\1{4,}/gu;

/** 有意文字率の最低閾値（50%） */
const MIN_MEANINGFUL_RATIO = 0.5;

/** 連続繰り返し文字が占める割合の上限（50%） */
const MAX_REPEATED_RATIO = 0.5;

export interface ContentValidationResult {
  isValid: boolean;
  meaningfulRatio: number;
  errorMessage?: string;
}

/**
 * 単一テキストフィールドの内容品質をチェック
 * フィラー文字の大量使用や同一文字の繰り返しを検出する
 */
export function validateContentQuality(text: string, fieldLabel: string): ContentValidationResult {
  if (!text || text.length === 0) {
    return { isValid: true, meaningfulRatio: 0 };
  }

  // 有意文字率の算出
  const meaningfulMatches = text.match(MEANINGFUL_CHARS_RE);
  const meaningfulCount = meaningfulMatches ? meaningfulMatches.length : 0;
  const meaningfulRatio = meaningfulCount / text.length;

  if (meaningfulRatio < MIN_MEANINGFUL_RATIO) {
    return {
      isValid: false,
      meaningfulRatio,
      errorMessage: `${fieldLabel}の記述内容が不十分です。記号や装飾文字が多すぎます。具体的な内容を日本語で記述してください。`,
    };
  }

  // 同一文字の連続繰り返しチェック
  const repeatedMatches = text.match(REPEATED_CHAR_RE);
  if (repeatedMatches) {
    const repeatedTotal = repeatedMatches.reduce((sum, m) => sum + m.length, 0);
    const repeatedRatio = repeatedTotal / text.length;

    if (repeatedRatio > MAX_REPEATED_RATIO) {
      return {
        isValid: false,
        meaningfulRatio,
        errorMessage: `${fieldLabel}に同じ文字の繰り返しが多く含まれています。具体的な内容を記述してください。`,
      };
    }
  }

  return { isValid: true, meaningfulRatio };
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
 * 全M1〜M5フィールドを検証し、最初の不合格を返す
 */
export function validateMissionContentQuality(mission: MissionInput): ContentValidationResult {
  const fields: (keyof MissionInput)[] = [
    'm1_missionName',
    'm2_backgroundGoal',
    'm3_contentDifficulty',
    'm4_stakeholdersRole',
    'm5_feasibilityEvidence',
  ];

  for (const field of fields) {
    const value = mission[field];
    if (typeof value !== 'string') continue;

    const label = FIELD_LABELS[field] || field;
    const result = validateContentQuality(value, label);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true, meaningfulRatio: 1 };
}
