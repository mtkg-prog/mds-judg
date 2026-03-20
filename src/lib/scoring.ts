import type { AIScoreResult, MissionInput } from './types';
import { roundToTwo } from './utils';

export function buildScoringPrompt(inputData: MissionInput): string {
  return `
あなたは人事評価制度の採点アシスタントです。
以下の提出フォーマットをもとに、各項目を1〜5点で採点してください。

【入力項目の意味】
- M1: ミッション名
- M2: 背景や課題と、1年後に目指すゴール
- M3: ミッションの内容や難易度
- M4: 関係先、巻き込む相手、自分の役割や立ち位置
- M5: ミッション完遂の根拠

【採点基準】
1. difficulty（難易度）
1: 定型的
2: 一部判断が必要
3: 工夫や調整が必要
4: 前例が少なく設計が必要
5: 前例が少なく高難度な推進が必要

2. scope（影響範囲）
1: 自分のみ
2: チーム内
3: 部署単位
4: 複数部署
5: 全社・事業レベル

3. innovation（新規性）
1: 既存運用の延長
2: 小改善
3: 新しい工夫
4: 新しい仕組みづくり
5: 競争力や組織に大きく影響する変革

4. contribution（課題寄与）
1: 課題寄与が小さい
2: 一定の寄与
3: 主要課題に一定寄与
4: 重要課題に強く寄与
5: 会社の大きな課題解決に直結

5. roleLevel（立ち位置）
1: 補助的
2: 実行担当
3: 主担当
4: 推進責任者
5: 意思決定責任者

6. feasibility（実現可能性）
1: 根拠が乏しい
2: やや弱い
3: 一定の根拠あり
4: 実績・能力・資源面で有力
5: 高い蓋然性で実現可能

【出力ルール】
- 必ずJSONのみを返してください
- Markdownのコードブロックは使わないでください
- commentは100文字以内の日本語
- 点数は必ず整数
- JSONキーは必ず次の通り:
difficulty, scope, innovation, contribution, roleLevel, feasibility, comment

【出力形式】
{
  "difficulty": 1,
  "scope": 1,
  "innovation": 1,
  "contribution": 1,
  "roleLevel": 1,
  "feasibility": 1,
  "comment": "..."
}

【提出内容】
${JSON.stringify(inputData, null, 2)}
`;
}

const SCORE_WEIGHTS = {
  difficulty: 0.20,
  scope: 0.15,
  innovation: 0.20,
  contribution: 0.20,
  roleLevel: 0.15,
  feasibility: 0.10,
} as const;

export function calculateMissionWeightedPoint(scores: AIScoreResult, weight: number): number {
  const basePoint = roundToTwo(
    scores.difficulty * SCORE_WEIGHTS.difficulty +
    scores.scope * SCORE_WEIGHTS.scope +
    scores.innovation * SCORE_WEIGHTS.innovation +
    scores.contribution * SCORE_WEIGHTS.contribution +
    scores.roleLevel * SCORE_WEIGHTS.roleLevel +
    scores.feasibility * SCORE_WEIGHTS.feasibility
  );

  return roundToTwo(basePoint * (weight / 100));
}
