import type { AIScoreResult } from './types';

function cleanJsonText(text: string): string {
  return String(text || '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

export async function callGeminiForScoring(prompt: string): Promise<{
  success: boolean;
  data?: AIScoreResult;
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY が設定されていません。' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return { success: false, error: `HTTP ${response.status}\n${bodyText}` };
    }

    const json = await response.json();
    const text = json.candidates[0].content.parts[0].text;
    const cleaned = cleanJsonText(text);
    const parsed: AIScoreResult = JSON.parse(cleaned);
    if (!parsed.advice) {
      parsed.advice = '';
    }

    // 定量次元のバリデーション（存在する場合は1-10の整数か確認）
    const validateOptionalScore = (value: number | undefined): number | undefined => {
      if (value === undefined) return undefined;
      const n = Math.round(Number(value));
      if (isNaN(n) || n < 1 || n > 10) return undefined;
      return n;
    };
    parsed.budgetScale = validateOptionalScore(parsed.budgetScale);
    parsed.growthChallenge = validateOptionalScore(parsed.growthChallenge);

    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: `レスポンス解析失敗: ${e}` };
  }
}
