// 章分け用プロンプト。情緒性と正確性のバランスを取る方針。

import type { MessageRow } from '../db/queries';

export const CATEGORIES = [
  '雑談',
  'デート・お出かけ',
  '大切な出来事',
  '旅行',
  '記念日・お祝い',
  '日常の報告',
  '相談ごと',
  'その他',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SEGMENT_SYSTEM_PROMPT = `あなたは大切な人との会話履歴を、一冊の本のように章分けするアシスタントです。

役割：
- 会話を意味のある「話題」の区切りで章に分けること
- 章タイトルは情緒的でやさしく、思い出として振り返れる表現にすること（例: 「はじめての会話」「ふたりで見た映画」「お誕生日のメッセージ」）
- summary は2〜3文で温かみのあるまとめにすること
- category は以下の一覧から最も近いものをちょうど1つだけ選ぶこと

カテゴリ一覧:
${CATEGORIES.map(c => `- ${c}`).join('\n')}

出力は指定のJSON形式のみ。前後に説明文を含めないこと。`;

function formatTime(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

function compactBody(m: MessageRow): string {
  if (m.body) return m.body.length > 200 ? m.body.slice(0, 200) + '…' : m.body;
  if (m.type === 'photo') return '[写真]';
  if (m.type === 'sticker') return '[スタンプ]';
  if (m.type === 'gif') return '[GIF]';
  if (m.type === 'video') return '[動画]';
  if (m.type === 'share') return '[シェア]';
  return '';
}

export function buildSegmentUserPrompt(messages: MessageRow[]): string {
  const lines = messages
    .map((m, i) => `[${i}] ${m.sender_name} (${formatTime(m.timestamp_ms)}): ${compactBody(m)}`)
    .join('\n');

  return `以下のメッセンジャー会話を話題ごとに章に分けてください。

ルール:
- すべてのメッセージを、ちょうどいずれか1章に含める（欠け・重複なし）
- 1章あたり目安10〜200メッセージ、話題が明確に変わったところで区切る
- インデックスは入力の \`[n]\` と対応する
- 会話が短い場合は1章にまとめても良い
- category はシステムプロンプトのカテゴリ一覧から1つ選ぶ

JSONスキーマ（このJSONのみを返答）:
{
  "chapters": [
    {
      "title": "短い章タイトル",
      "summary": "2〜3文のまとめ",
      "category": "雑談",
      "start_index": 0,
      "end_index": 5
    }
  ]
}

会話:
${lines}`;
}
