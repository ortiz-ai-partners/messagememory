// 会話のカテゴリ分布から「この会話の輪郭」を3文で表現するAI感想。
// カテゴリ分布画面で表示する。BYOK（ユーザーのAPIキー）を使う。

import Anthropic from '@anthropic-ai/sdk';

import { SEGMENTER_MODEL } from './segmenter';

export type CommentaryInput = {
  title: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;
  categories: { name: string; count: number; percent: number }[];
};

const SYSTEM_PROMPT = `あなたは大切な人との会話の特徴を、3文の温かい言葉で表現するアシスタントです。

役割：
- カテゴリの分布から、その会話の関係性の輪郭をやさしく描写する
- 数字を直接読み上げず、関係性のニュアンスとして表現する
  （例: 「デートが多い → ふたりで過ごす時間を大切にしてきた」）
- 押しつけがましくならず、読み手が「私たちらしい」と感じる優しいトーン
- ちょうど3文。改行で区切る

出力は本文のみ。前置きやJSONは不要。`;

function buildUserPrompt(input: CommentaryInput): string {
  const lines = input.categories
    .map(c => `- ${c.name}: ${c.count}章（${c.percent}%）`)
    .join('\n');

  return `会話タイトル: ${input.title}
期間: ${input.startDate} 〜 ${input.endDate}

カテゴリ分布:
${lines}

この会話の輪郭を3文で書いてください。`;
}

export async function generateCommentary(
  apiKey: string,
  input: CommentaryInput,
): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: SEGMENTER_MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('感想を生成できませんでした');
  }
  return textBlock.text.trim();
}
