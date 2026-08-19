import type { AIScoreResult, BusinessQuantitativeInput, ComputedRatios, DepartmentType, IndirectQuantitativeInput, MissionInput, PositionGroup, QuantitativeInput } from './types';
import { roundToTwo } from './utils';
import { normalizePositionGroup } from './aggregation';
import { getGroupRubric, getQuantitativeRubric } from './scoring-rubrics';

const COMPANY_MVV = {
  vision: '高齢社会をアップデートする',
  mission: 'いくつになってもイキイキ暮らせる社会を ― 年齢に関係なく自分の人生をデザインできる社会を実現し、「働く」を自己実現の場に変革する',
  careerShip: [
    { label: 'コミットメント', description: '主体性を持ち、約束を守る' },
    { label: 'インテグリティ', description: '誠実・素直・まじめに向き合う' },
    { label: 'パーソナリティ', description: '個の尊重、多様性を大切にする' },
    { label: 'ポジティブ', description: '前向き、変化に柔軟、挑戦心を持つ' },
  ],
} as const;

function getPositionGroupContext(position?: string): { groupLabel: string; groupDescription: string } {
  if (!position) return { groupLabel: '不明', groupDescription: '' };
  const group = normalizePositionGroup(position);
  const descriptions: Record<PositionGroup, { label: string; desc: string }> = {
    groupA: { label: 'Aグループ（プレイヤー）', desc: '担当・チーフ・支店長代理レベル：プレイヤーとして自ら手を動かし、圧倒的な実績と周囲への好影響が期待される。会社の4つの姿勢（コミットメント・インテグリティ・パーソナリティ・ポジティブ）の体現度も重視' },
    groupL: { label: 'Lグループ（小隊長）', desc: '支店長・課長レベル：3〜6名程度のチームの結果責任者。会社・部の方針を理解し、チームを率いて成果を出すことが期待される' },
    groupU: { label: 'Uグループ（隊長）', desc: '支社長・ユニットマネージャーレベル：3〜6支店・課程度を取りまとめるマネージャー。複数チームの管理・推進とリーダーシップの発揮が期待される' },
    groupG: { label: 'Gグループ（参謀・司令）', desc: '統括・グループマネージャーレベル：事業戦略・予算策定・仕組みづくり・施策の立案と実行推進が期待される。問題の本質を見抜き、最新技術を取り入れた最適な施策が求められる' },
    groupD: { label: 'Dグループ（将軍）', desc: '本部長・ディビジョンマネージャーレベル：経営に直結する判断とリーダーシップが期待される。全社的な視野と経営者としての意思決定が必須' },
  };
  const d = descriptions[group];
  return { groupLabel: d.label, groupDescription: d.desc };
}

function getDepartmentTypeContext(departmentType?: DepartmentType): string {
  if (!departmentType) return '';

  if (departmentType === 'business') {
    return `
【部門種別：事業部門】
この提出者は事業部門（売上・収益に直結する部門）に所属しています。
採点時、以下の事業部門特有の観点を考慮してください：
- contribution（課題寄与）: 売上拡大、利益率向上、顧客獲得・維持、市場シェア拡大への寄与度を重視
- scope（影響範囲）: クライアントへの影響、市場へのインパクトも影響範囲に含める
- innovation（新規性）: 新規事業開発、サービス改善、競合優位性の創出を高く評価
- difficulty（難易度）: 市場環境の変化や競合との競争を踏まえた難易度を考慮
`;
  }

  return `
【部門種別：間接部門】
この提出者は間接部門（人事・経理・IT・法務など、または事業部門内の間接業務担当）に所属しています。
採点時、以下の間接部門特有の観点を考慮してください：
- contribution（課題寄与）: 組織全体の効率化、コンプライアンス強化、内部統制、社員満足度向上への寄与度を重視
- scope（影響範囲）: 社内の複数部門への波及効果、全社的な仕組みづくりへの影響を評価
- innovation（新規性）: 業務プロセスの抜本的改善、制度設計、標準化への取り組みを高く評価
- difficulty（難易度）: 多部門との調整、法規制・制度対応の複雑さを考慮
- 間接部門は売上に直結しないため、「売上への直接的貢献」を求めすぎないでください。代わりに、組織基盤の強化や業務品質の向上に着目してください
`;
}

function getMvvWeightingContext(position?: string): string {
  if (!position) return '';
  const group = normalizePositionGroup(position);

  const mvvCoreText = `
【経営理念・ビジョン】
当社のビジョン: 「${COMPANY_MVV.vision}」
当社のミッション: 「${COMPANY_MVV.mission}」

【キャリアシップ（行動指針）】
${COMPANY_MVV.careerShip.map(c => `- ${c.label}：${c.description}`).join('\n')}
`;

  const emphasisByGroup: Record<PositionGroup, { level: string; instruction: string }> = {
    groupA: {
      level: '参考程度',
      instruction: 'A群（担当・チーフ・支店長代理）のミッションでは、MVVとの直接的な整合性は必須ではありません。ただし、ミッション内容がMVVの方向性と明らかに矛盾する場合は、commentで軽く言及してください。',
    },
    groupL: {
      level: '考慮',
      instruction: 'L群（支店長・課長）のミッションでは、MVV・キャリアシップとの一定の整合性が期待されます。特にcontribution（課題寄与）の評価において、ミッションが会社のビジョン実現にどう貢献するかを考慮してください。MVVとの接点が全く見えないミッションは、contributionで1点減点の目安としてください。',
    },
    groupU: {
      level: '重視',
      instruction: `U群（支社長・ユニットマネージャー）のミッションでは、MVV・キャリアシップとの整合性を重視してください。contributionとinnovationの評価において、ミッションが「${COMPANY_MVV.vision}」の実現にどう寄与するかを明確に評価してください。MVVとの接点が見えないミッションは、contribution・innovationそれぞれで1〜2点減点の目安としてください。キャリアシップの体現（特にコミットメントとポジティブ）がミッション内容に反映されているかも確認してください。`,
    },
    groupG: {
      level: '強く重視',
      instruction: `G群（統括・グループマネージャー）のミッションでは、MVV・キャリアシップとの強い整合性が求められます。全6項目の評価において、ミッションが経営理念の実現に向けた戦略的取り組みであるかを意識してください。特にcontribution・innovation・scopeでは、「${COMPANY_MVV.vision}」への貢献が具体的に読み取れるかを重視してください。キャリアシップの4要素（コミットメント・インテグリティ・パーソナリティ・ポジティブ）の体現が見えないミッションは、全体的に厳しく採点してください。adviceでもMVVとの接続について具体的に言及してください。`,
    },
    groupD: {
      level: '最重視（必須）',
      instruction: `D群（本部長・ディビジョンマネージャー）のミッションでは、MVV・キャリアシップとの完全な整合性が必須です。経営レベルの役職として、ミッションそのものが「${COMPANY_MVV.vision}」の実現を直接推進するものでなければなりません。全6項目の評価でMVV整合性を組み込んでください。MVVとの明確な接続が見えないミッションは、contribution・innovation・scopeで大幅に減点（各2〜3点減点）してください。キャリアシップの4要素すべてがミッション遂行の中で体現される計画が示されていることを期待してください。commentとadviceの両方でMVV・キャリアシップへの言及を必ず含めてください。`,
    },
  };

  const { level, instruction } = emphasisByGroup[group];

  return `
${mvvCoreText}
【MVV・キャリアシップの評価への組み込み（重要度: ${level}）】
${instruction}
`;
}

export function buildScoringPrompt(inputData: MissionInput, position?: string, departmentType?: DepartmentType, quantitative?: QuantitativeInput): string {
  const { groupLabel, groupDescription } = getPositionGroupContext(position);
  const group = position ? normalizePositionGroup(position) : 'groupA';
  const rubricSection = getGroupRubric(group);
  const hasQuant = hasQuantitativeData(quantitative);

  const positionSection = position ? `
【提出者情報】
この提出者の役職は「${position}」（${groupLabel}）です。
${groupDescription}
★重要：以下の採点基準はこの役職グループ専用です。この役職に求められる水準で厳格に採点してください。
` : '';

  const departmentSection = getDepartmentTypeContext(departmentType);
  const mvvSection = getMvvWeightingContext(position);

  // 定量データセクション（入力がある場合のみ）
  const quantitativeSection = hasQuant
    ? buildQuantitativeSection(quantitative!, departmentType || 'business')
    : '';

  // 採点次元数に応じた出力ルール
  const totalDimensions = hasQuant ? 8 : 6;
  const jsonKeys = hasQuant
    ? 'difficulty, scope, innovation, contribution, roleLevel, feasibility, budgetScale, growthChallenge, comment, advice'
    : 'difficulty, scope, innovation, contribution, roleLevel, feasibility, comment, advice';
  const outputFormat = hasQuant
    ? `{
  "difficulty": 1,
  "scope": 1,
  "innovation": 1,
  "contribution": 1,
  "roleLevel": 1,
  "feasibility": 1,
  "budgetScale": 1,
  "growthChallenge": 1,
  "comment": "...",
  "advice": "..."
}`
    : `{
  "difficulty": 1,
  "scope": 1,
  "innovation": 1,
  "contribution": 1,
  "roleLevel": 1,
  "feasibility": 1,
  "comment": "...",
  "advice": "..."
}`;

  return `
あなたは人事評価制度の厳格な採点官です。
以下の提出フォーマットをもとに、各項目を1〜10点で**厳しく**採点してください。
${positionSection}${departmentSection}${mvvSection}
【重要な採点方針】
- あなたは甘い採点を絶対にしてはいけません。厳格かつ保守的に採点してください。
- 5点が「この役職グループにとって標準的なミッション」の基準です。大半のミッションは4〜6点に収まるべきです。
- 7点以上は「この役職グループの中でも明確に優れている」場合のみ付けてください。具体的な根拠が必要です。
- 9〜10点は「極めて例外的」な場合のみです。全体の5%未満が目安です。
- 記述が曖昧・抽象的・具体性に欠ける場合は、1〜3点としてください。
- 「〜を推進する」「〜に貢献する」のような漠然とした表現だけでは5点以上にしないでください。
- 上位役職者のミッションで「部下に指示する」「管理する」のみで自身の具体的行動が見えない場合、roleLevelは1〜2点としてください。肩書きや立場ではなく、実際の関与度を評価してください。
- 「部下の指導・教育を行う」「部下を育成する」という記載にも注意してください。これが本人自身のミッションの実行を部下に押し付けているだけの可能性があります。指導・教育と称しつつ、実質的に自分が取り組むべき業務を部下にやらせている場合は、roleLevelを1〜2点としてください。本当の指導・教育であれば、育成の具体的な計画・方法・目標が記載されているはずです。

【★最重要：視座ミスマッチ検出ルール】
ミッション内容の「視座（どの立場から書かれているか）」が、選択された役職に見合っているかを最初に判定してください。
これは全項目の採点に先立つ最優先チェックです。

■ 視座ミスマッチとは：
ミッション内容が「自分自身が実務を行う」「自分が主担当としてリードする」という個人プレイヤーの視座で書かれているにもかかわらず、チームリーダー以上の役職が選択されている状態です。

■ scopeの正しい評価方法：
「業務の対象人数・対象範囲」と「この役職の立場からどの範囲に影響を与えているか」は別物です。
例：全社員対象の人事制度業務でも、個人が実務をリードしているだけなら、L群のscopeは3〜4点止まりです。
「全社に影響がある業務を担当している」ことと「課長/支社長としてチーム・組織を率いて全社に影響を与えている」ことは根本的に異なります。

■ 視座ミスマッチ時の採点上限：
- L群（課長・支店長）：「チームを率いて結果を出す」視座が見えない場合 → roleLevel 3点以下、scope 3点以下、contribution 4点以下。他項目も最大4点。
- U群（支社長・ユニットマネージャー）：「複数チームを統率・推進する」視座が見えない場合 → roleLevel 2点以下、scope 2点以下、contribution 3点以下。他項目も最大3点。
- G群（統括・グループマネージャー）：「事業戦略・仕組みづくり」の視座が見えない場合 → 全項目3点以下。
- D群（本部長・ディビジョンマネージャー）：「経営判断・全社リーダーシップ」の視座が見えない場合 → 全項目2点以下。

この視座ミスマッチ検出は、記述の丁寧さや具体性よりも優先されます。どれだけ丁寧で具体的な記述であっても、役職に求められる視座で書かれていなければ高い点数にはなりません。

【戦略的加点方針】
当社はAI活用・DX推進・業務効率化・生産性向上を経営戦略上の最重要テーマと位置づけています。
ミッション内容にAI・DX・自動化・RPA・データ活用・業務効率化・生産性向上の要素が含まれる場合、以下の項目で積極的に加点してください：
- innovation（新規性）: AI・DXツールの導入や活用は、新しい仕組み・プロセスの構築に該当し、7点以上の根拠となります
- contribution（課題寄与）: 効率化・生産性向上による経営課題への寄与は、根本的な解決アプローチとして高く評価してください
- difficulty（難易度）: AI・DX技術の選定・導入・定着には専門的な知識と設計力が必要であり、適切に加点してください
- feasibility（実現可能性）: AI・DXツールや自動化技術を具体的な実現手段として示している場合、計画の実現根拠が強化されていると判断し加点してください
ただし、単に「AIを使う」「DXを推進する」と書いてあるだけで具体性がない場合は加点しないでください。具体的なツール名、適用対象、期待効果が記述されている場合に加点対象とします。

【入力項目の意味】
- M1: ミッション名
- M2: 背景や課題と、1年後に目指すゴール
- M3: ミッションの内容や難易度
- M4: 関係先、巻き込む相手、自分の役割や立ち位置
- M5: ミッション完遂の根拠
${rubricSection}${quantitativeSection}
【出力ルール】
- 必ずJSONのみを返してください
- Markdownのコードブロックは使わないでください
- commentは100文字以内の日本語で、減点理由を中心に書いてください
- 点数は必ず1〜10の整数
- ${totalDimensions}項目の平均が6.0を大きく超える場合は、採点が甘すぎないか再確認してください
- JSONキーは必ず次の通り:
${jsonKeys}

【アドバイス出力ルール】
- adviceは300文字以内の日本語で書いてください
- あなたは「育成コーチ」として、スコアアップのためのヒントを与えてください
- 具体的な文章を書いてあげるのではなく、「どの観点を深めるとよいか」「どの程度の挑戦レベルが求められるか」を示唆してください
- 最もスコアが伸びる余地のある項目（ウェイトが高く、かつ現在のスコアが低い項目）に焦点を当ててください
- 役職に応じた期待値を踏まえて書いてください（上位役職ほど、より戦略的・組織横断的な視点が求められます）
- 「〜を書いてください」ではなく「〜の視点があると評価が上がりやすい」のような間接的な表現を使ってください
- 答えそのものを教えるのではなく、考える方向性を示してください

【出力形式】
${outputFormat}

【提出内容】
${JSON.stringify(inputData, null, 2)}
`;
}

interface ScoreWeights {
  difficulty: number;
  scope: number;
  innovation: number;
  contribution: number;
  roleLevel: number;
  feasibility: number;
}

/** 8次元用の加重配分（budgetScale + growthChallenge を含む） */
interface ExtendedScoreWeights extends ScoreWeights {
  budgetScale: number;
  growthChallenge: number;
}

/** 役職グループ別の加重配分（6次元） */
const SCORE_WEIGHTS_BY_GROUP: Record<PositionGroup, ScoreWeights> = {
  groupA: { difficulty: 0.15, scope: 0.10, innovation: 0.15, contribution: 0.15, roleLevel: 0.30, feasibility: 0.15 },
  groupL: { difficulty: 0.15, scope: 0.15, innovation: 0.15, contribution: 0.20, roleLevel: 0.20, feasibility: 0.15 },
  groupU: { difficulty: 0.15, scope: 0.15, innovation: 0.25, contribution: 0.15, roleLevel: 0.15, feasibility: 0.15 },
  groupG: { difficulty: 0.15, scope: 0.25, innovation: 0.20, contribution: 0.25, roleLevel: 0.05, feasibility: 0.10 },
  groupD: { difficulty: 0.10, scope: 0.25, innovation: 0.20, contribution: 0.30, roleLevel: 0.05, feasibility: 0.10 },
};

/** 役職グループ別の加重配分（8次元：定量データ入力時） */
const SCORE_WEIGHTS_8DIM_BY_GROUP: Record<PositionGroup, ExtendedScoreWeights> = {
  groupA: { difficulty: 0.13, scope: 0.08, innovation: 0.13, contribution: 0.13, roleLevel: 0.28, feasibility: 0.13, budgetScale: 0.05, growthChallenge: 0.07 },
  groupL: { difficulty: 0.13, scope: 0.12, innovation: 0.13, contribution: 0.17, roleLevel: 0.18, feasibility: 0.13, budgetScale: 0.07, growthChallenge: 0.07 },
  groupU: { difficulty: 0.12, scope: 0.12, innovation: 0.22, contribution: 0.12, roleLevel: 0.13, feasibility: 0.13, budgetScale: 0.08, growthChallenge: 0.08 },
  groupG: { difficulty: 0.12, scope: 0.20, innovation: 0.16, contribution: 0.20, roleLevel: 0.04, feasibility: 0.08, budgetScale: 0.10, growthChallenge: 0.10 },
  groupD: { difficulty: 0.08, scope: 0.20, innovation: 0.16, contribution: 0.24, roleLevel: 0.04, feasibility: 0.08, budgetScale: 0.10, growthChallenge: 0.10 },
};

/** 定量データが十分に入力されているか判定 */
export function hasQuantitativeData(quantitative?: QuantitativeInput): boolean {
  if (!quantitative) return false;

  // 事業部門: 予算額・売上目標・利益目標のいずれかがあればbudgetScale採点可能
  if ('salesTarget' in quantitative || 'budgetAmount' in quantitative || 'profitTarget' in quantitative) {
    const bq = quantitative as BusinessQuantitativeInput;
    return !!(bq.budgetAmount || bq.salesTarget || bq.profitTarget);
  }

  // 間接部門: コスト削減目標または前年コスト実績があれば採点可能
  if ('costReductionTarget' in quantitative || 'prevYearCost' in quantitative) {
    const iq = quantitative as IndirectQuantitativeInput;
    return !!(iq.costReductionTarget || iq.prevYearCost);
  }

  return false;
}

/** 前年比を自動計算 */
export function computeYoyRatios(quantitative: QuantitativeInput, departmentType: DepartmentType): ComputedRatios {
  const ratios: ComputedRatios = {};

  if (departmentType === 'business') {
    const bq = quantitative as BusinessQuantitativeInput;
    // 売上前年比（ゼロ除算防止）
    if (bq.salesTarget && bq.prevYearSales && bq.prevYearSales > 0) {
      ratios.salesYoyRatio = roundToTwo((bq.salesTarget / bq.prevYearSales) * 100);
    }
    // 利益前年比（前年がマイナスの場合は特殊扱い）
    if (bq.profitTarget !== undefined && bq.prevYearProfit !== undefined && bq.prevYearProfit !== 0) {
      ratios.profitYoyRatio = roundToTwo((bq.profitTarget / bq.prevYearProfit) * 100);
    }
  } else {
    const iq = quantitative as IndirectQuantitativeInput;
    // コスト削減率
    if (iq.costReductionTarget && iq.prevYearCost && iq.prevYearCost > 0) {
      ratios.costReductionRatio = roundToTwo((iq.costReductionTarget / iq.prevYearCost) * 100);
    }
  }

  return ratios;
}

/** 定量データのプロンプトセクションを構築 */
function buildQuantitativeSection(quantitative: QuantitativeInput, departmentType: DepartmentType): string {
  const ratios = computeYoyRatios(quantitative, departmentType);
  const rubric = getQuantitativeRubric(departmentType);

  let dataLines = '';

  if (departmentType === 'business') {
    const bq = quantitative as BusinessQuantitativeInput;
    const lines: string[] = [];
    if (bq.budgetAmount) lines.push(`予算額: ${bq.budgetAmount.toLocaleString()}万円`);
    if (bq.salesTarget) lines.push(`売上目標: ${bq.salesTarget.toLocaleString()}万円`);
    if (bq.profitTarget) lines.push(`利益目標: ${bq.profitTarget.toLocaleString()}万円`);
    if (bq.prevYearSales) lines.push(`前年売上実績: ${bq.prevYearSales.toLocaleString()}万円`);
    if (bq.prevYearProfit !== undefined) lines.push(`前年利益実績: ${bq.prevYearProfit.toLocaleString()}万円`);
    dataLines = lines.join('\n');

    // 自動計算値
    const calcLines: string[] = [];
    if (ratios.salesYoyRatio) calcLines.push(`売上前年比: ${ratios.salesYoyRatio}%`);
    if (ratios.profitYoyRatio) calcLines.push(`利益前年比: ${ratios.profitYoyRatio}%`);
    // 前年赤字→今期黒字のケース検出
    if (bq.prevYearProfit !== undefined && bq.prevYearProfit < 0 && bq.profitTarget !== undefined && bq.profitTarget > 0) {
      calcLines.push(`※ 赤字→黒字転換を目指すミッション（growthChallengeで8点以上を検討）`);
    }
    if (calcLines.length > 0) {
      dataLines += `\n\n【自動計算値】\n${calcLines.join('\n')}`;
    }
  } else {
    const iq = quantitative as IndirectQuantitativeInput;
    const lines: string[] = [];
    if (iq.costReductionTarget) lines.push(`コスト削減目標: ${iq.costReductionTarget.toLocaleString()}万円`);
    if (iq.efficiencyTarget) lines.push(`業務効率化目標: ${iq.efficiencyTarget}`);
    if (iq.prevYearCost) lines.push(`前年コスト実績: ${iq.prevYearCost.toLocaleString()}万円`);
    dataLines = lines.join('\n');

    if (ratios.costReductionRatio) {
      dataLines += `\n\n【自動計算値】\nコスト削減率: ${ratios.costReductionRatio}%`;
    }
  }

  return `
【定量データ】
この提出者は以下の定量データを申告しています。budgetScaleとgrowthChallengeの採点に使用してください。
これらの2項目はミッション記述文の質ではなく、定量データに基づいて採点してください。

${dataLines}

【追加採点基準】
${rubric}
`;
}

export function calculateMissionWeightedPoint(scores: AIScoreResult, weight: number, position?: string): number {
  const group = position ? normalizePositionGroup(position) : 'groupA';
  const has8Dim = scores.budgetScale !== undefined && scores.growthChallenge !== undefined;

  let basePoint: number;

  if (has8Dim) {
    // 8次元重み
    const w = SCORE_WEIGHTS_8DIM_BY_GROUP[group];
    basePoint = roundToTwo(
      scores.difficulty * w.difficulty +
      scores.scope * w.scope +
      scores.innovation * w.innovation +
      scores.contribution * w.contribution +
      scores.roleLevel * w.roleLevel +
      scores.feasibility * w.feasibility +
      scores.budgetScale! * w.budgetScale +
      scores.growthChallenge! * w.growthChallenge
    );
  } else {
    // 従来の6次元重み
    const w = SCORE_WEIGHTS_BY_GROUP[group];
    basePoint = roundToTwo(
      scores.difficulty * w.difficulty +
      scores.scope * w.scope +
      scores.innovation * w.innovation +
      scores.contribution * w.contribution +
      scores.roleLevel * w.roleLevel +
      scores.feasibility * w.feasibility
    );
  }

  return roundToTwo(basePoint * (weight / 100));
}
