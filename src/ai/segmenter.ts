// Claude API（Haiku 4.5）で会話を話題ごとに章分けするモジュール。
// BYOK前提。APIキーは apiKeyStore 経由で呼び出し側が取得して渡す。
//
// 会話が大きい場合は自動でチャンクに分割し、複数回のAPIコールで処理する。
// Claude Haiku の入力上限は約 200,000 トークン。
// 安全マージンを取って 1チャンク 3000メッセージくらいを目安に分割する。

import Anthropic from '@anthropic-ai/sdk';

import type { MessageRow, ChapterInput } from '../db/queries';
import { CATEGORIES, SEGMENT_SYSTEM_PROMPT, buildSegmentUserPrompt } from './prompts';

export const SEGMENTER_MODEL = 'claude-haiku-4-5-20251001';

// 1チャンクあたりのメッセージ上限。
// 入力だけでなく、出力（数十の章+タイトル+サマリ）も収める必要があるので余裕を持って1500に。
// プロンプトで「1章150-300メッセージ」と指示することで、1チャンクあたりの章数を5-10程度に抑え、
// 出力トークンも安全圏内に収まる。
const MAX_MESSAGES_PER_CHUNK = 1500;

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

export type SegmentProgress = { current: number; total: number };

export async function segmentConversation(
  apiKey: string,
  messages: MessageRow[],
  onProgress?: (p: SegmentProgress) => void,
): Promise<ChapterInput[]> {
  if (messages.length === 0) return [];

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // チャンク分割
  const chunks: MessageRow[][] = [];
  for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_CHUNK) {
    chunks.push(messages.slice(i, i + MAX_MESSAGES_PER_CHUNK));
  }

  const allChapters: ChapterInput[] = [];
  const failures: string[] = [];

  for (let ci = 0; ci < chunks.length; ci++) {
    onProgress?.({ current: ci + 1, total: chunks.length });
    const chunkMessages = chunks[ci];

    let response;
    try {
      response = await client.messages.create({
        model: SEGMENTER_MODEL,
        max_tokens: 4096,
        system: SEGMENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildSegmentUserPrompt(chunkMessages) }],
      });
    } catch (e) {
      failures.push(`チャンク${ci + 1}: API呼び出し失敗 (${e instanceof Error ? e.message : String(e)})`);
      continue;
    }

    // 出力が打ち切られたら検出（max_tokens に到達するとJSONが壊れる）
    if (response.stop_reason === 'max_tokens') {
      failures.push(`チャンク${ci + 1}: 出力が長すぎて打ち切られた`);
      continue;
    }

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      failures.push(`チャンク${ci + 1}: テキスト応答なし`);
      continue;
    }

    let raw: string;
    try {
      raw = extractJson(textBlock.text);
    } catch {
      failures.push(`チャンク${ci + 1}: JSONが見つからない（出力が途中で切れた可能性）`);
      continue;
    }

    let parsed: { chapters?: RawChapter[] };
    try {
      parsed = JSON.parse(raw) as { chapters?: RawChapter[] };
    } catch {
      failures.push(`チャンク${ci + 1}: JSON構文エラー（出力が途中で切れた可能性）`);
      continue;
    }
    const rawChapters = parsed.chapters ?? [];
    let addedFromChunk = 0;

    for (const ch of rawChapters) {
      // タイトルが空文字や空白だけのものは除外
      if (typeof ch.title !== 'string' || ch.title.trim() === '') continue;
      if (typeof ch.start_index !== 'number' || typeof ch.end_index !== 'number') continue;
      // インデックスが範囲外でも、有効な範囲にクランプして救う
      const startIdx = Math.max(0, Math.min(ch.start_index, chunkMessages.length - 1));
      const endIdx = Math.max(startIdx, Math.min(ch.end_index, chunkMessages.length - 1));

      allChapters.push({
        title: ch.title.trim(),
        summary: (ch.summary ?? '').trim(),
        category: normalizeCategory(ch.category),
        start_message_id: chunkMessages[startIdx].id,
        end_message_id: chunkMessages[endIdx].id,
      });
      addedFromChunk++;
    }

    if (addedFromChunk === 0) {
      failures.push(`チャンク${ci + 1}: 章が生成されなかった`);
    }
  }

  // 全部失敗した場合は失敗内容を投げる
  if (allChapters.length === 0 && failures.length > 0) {
    throw new Error(`AIから章を生成できませんでした:\n・${failures.slice(0, 3).join('\n・')}`);
  }

  return allChapters;
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
