// Claude API（Haiku 4.5）で会話を話題ごとに章分けするモジュール。
// BYOK前提。APIキーは apiKeyStore 経由で呼び出し側が取得して渡す。

import Anthropic from '@anthropic-ai/sdk';

import type { MessageRow, ChapterInput } from '../db/queries';
import { CATEGORIES, SEGMENT_SYSTEM_PROMPT, buildSegmentUserPrompt } from './prompts';

export const SEGMENTER_MODEL = 'claude-haiku-4-5-20251001';

type RawChapter = {
  title?: string;
  summary?: string;
  category?: string;
  start_index?: number;
  end_index?: number;
};

function normalizeCategory(raw: unknown): string {
  if (typeof raw !== 'string') return 'その他';
  return (CATEGORIES as readonly string[]).includes(raw) ? raw : 'その他';
}

export async function segmentConversation(
  apiKey: string,
  messages: MessageRow[],
): Promise<ChapterInput[]> {
  if (messages.length === 0) return [];

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: SEGMENTER_MODEL,
    max_tokens: 8192,
    system: SEGMENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildSegmentUserPrompt(messages) }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('モデルからテキスト応答が得られませんでした');
  }

  const raw = extractJson(textBlock.text);
  const parsed = JSON.parse(raw) as { chapters?: RawChapter[] };
  const chapters = parsed.chapters ?? [];

  return chapters
    .filter(ch =>
      typeof ch.title === 'string' &&
      typeof ch.start_index === 'number' &&
      typeof ch.end_index === 'number' &&
      ch.start_index >= 0 &&
      ch.end_index < messages.length &&
      ch.start_index <= ch.end_index,
    )
    .map<ChapterInput>(ch => ({
      title: ch.title as string,
      summary: ch.summary ?? '',
      category: normalizeCategory(ch.category),
      start_message_id: messages[ch.start_index!].id,
      end_message_id: messages[ch.end_index!].id,
    }));
}

// 応答に余計な前後テキストが混じっていても {...} 部分だけを抜き出す
function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('応答からJSONが見つかりませんでした');
  }
  return text.slice(start, end + 1);
}
