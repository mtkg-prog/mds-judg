import type { AIScoreResult, MissionInput } from './types';
import { roundToTwo } from './utils';

export function buildScoringPrompt(inputData: MissionInput): string {
  return `
あなたは人事評価制度の厳格な採点官です。
以下の提出フォーマットをもとに、各項目を1〜10点で**厳しく**採点してください。

【重要な採点方針】
- あなたは甘い採点を絶対にしてはいけません。厳格かつ保守的に採点してください。
- 5点が「標準的なミッション」の基準です。大半のミッションは4〜6点に収まるべきです。
- 7点以上は「明確に優れている」場合のみ付けてください。具体的な根拠が必要です。
- 9〜10点は「極めて例外的」な場合のみです。全体の5%未満が目安です。
- 記述が曖昧・抽象的・具体性に欠ける場合は、1〜3点としてください。
- 「〜を推進する」「〜に貢献する」のような漠然とした表現だけでは5点以上にしないでください。

【入力項目の意味】
- M1: ミッション名
- M2: 背景や課題と、1年後に目指すゴール
- M3: ミッションの内容や難易度
- M4: 関係先、巻き込む相手、自分の役割や立ち位置
- M5: ミッション完遂の根拠

【採点基準】
1. difficulty（難易度）
1-2: 定型的・ルーティン業務の範囲
3-4: 一部判断が必要だが前例がある
5-6: 工夫や調整が必要（これが標準）
7-8: 前例が少なく、自ら設計・構築が必要（具体的な新規性の記述が必要）
9-10: 業界でも前例が少なく、高難度な推進が必要（極めて稀）

2. scope（影響範囲）
1-2: 自分の業務のみ
3-4: チーム内に留まる
5-6: 部署単位に影響（これが標準）
7-8: 複数部署に明確に影響（具体的な部署名や連携内容の記述が必要）
9-10: 全社・事業レベルの影響（経営層への影響を具体的に示す記述が必要）

3. innovation（新規性）
1-2: 既存運用の延長・前年踏襲
3-4: 既存業務の小改善
5-6: 新しい工夫を含む（これが標準）
7-8: 新しい仕組み・プロセスの構築（具体的な新規要素の記述が必要）
9-10: 組織や競争力に大きく影響する変革（極めて稀）

4. contribution（課題寄与）※「対処療法か根治療法か」の観点を含む
1-2: 課題との関連が薄い・寄与が小さい。または発生した事象への一時的な対応に留まる
3-4: 一定の寄与があるが限定的。対処療法的で、根本原因への踏み込みが見られない
5-6: 主要課題に一定寄与（これが標準）。課題の表層だけでなく一定の原因分析がある
7-8: 重要な経営課題に強く寄与。原因を特定し再発防止や抜本的な解決に取り組んでいる（具体的な記述が必要）
9-10: 会社の最重要課題の根本原因に切り込み、仕組みレベルで解決に直結（極めて稀）

5. roleLevel（立ち位置）
1-2: 補助的・サポート役
3-4: 実行担当として動く
5-6: 主担当として責任を持つ（これが標準）
7-8: プロジェクトの推進責任者（チームを率いる具体的記述が必要）
9-10: 最終意思決定責任者（極めて稀）

6. feasibility（実現可能性）
1-2: 根拠がほとんど示されていない
3-4: 根拠がやや弱い・抽象的
5-6: 一定の根拠あり（これが標準）
7-8: 実績・能力・資源面で具体的根拠がある（過去実績や数値の記述が必要）
9-10: 高い蓋然性で実現可能（極めて強い根拠が必要）

【出力ルール】
- 必ずJSONのみを返してください
- Markdownのコードブロックは使わないでください
- commentは100文字以内の日本語で、減点理由を中心に書いてください
- 点数は必ず1〜10の整数
- 6項目の平均が6.0を大きく超える場合は、採点が甘すぎないか再確認してください
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
