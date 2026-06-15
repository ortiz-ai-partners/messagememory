// DBクエリ関数。会話・メッセージ・メディアのCRUDを型安全に提供する。

import type * as SQLite from 'expo-sqlite';
import type { ParsedConversation } from '../parsers/messengerJsonParser';

export type ConversationRow = {
  id: number;
  title: string;
  participant_count: number;
  imported_at: number;
  is_pinned: number; // 0 or 1
};

export type MessageRow = {
  id: number;
  conversation_id: number;
  timestamp_ms: number;
  sender_name: string;
  body: string | null;
  type: string;
};

export type MediaRow = {
  id: number;
  message_id: number;
  kind: string;
  local_path: string;
  width: number | null;
  height: number | null;
};

/** 会話を一件インポートする。会話ID、インポートしたメッセージ件数を返す。 */
export async function importConversation(
  db: SQLite.SQLiteDatabase,
  parsed: ParsedConversation,
): Promise<{ conversationId: number; messageCount: number }> {
  const importedAt = Date.now();
  let conversationId = 0;

  await db.withTransactionAsync(async () => {
    const convResult = await db.runAsync(
      'INSERT INTO conversations (title, participant_count, imported_at) VALUES (?, ?, ?)',
      [parsed.title, parsed.participants.length, importedAt],
    );
    conversationId = convResult.lastInsertRowId as number;

    for (const name of parsed.participants) {
      await db.runAsync(
        'INSERT INTO participants (conversation_id, name) VALUES (?, ?)',
        [conversationId, name],
      );
    }

    for (const m of parsed.messages) {
      const msgResult = await db.runAsync(
        'INSERT INTO messages (conversation_id, timestamp_ms, sender_name, body, type) VALUES (?, ?, ?, ?, ?)',
        [conversationId, m.timestamp_ms, m.sender_name, m.body, m.type],
      );
      const messageId = msgResult.lastInsertRowId as number;
      for (const media of m.media) {
        await db.runAsync(
          'INSERT INTO media_refs (message_id, kind, local_path) VALUES (?, ?, ?)',
          [messageId, media.kind, media.uri],
        );
      }
    }
  });

  return { conversationId, messageCount: parsed.messages.length };
}

const CONVERSATION_COLS = 'id, title, participant_count, imported_at, is_pinned';

export async function listConversations(db: SQLite.SQLiteDatabase): Promise<ConversationRow[]> {
  return db.getAllAsync<ConversationRow>(
    `SELECT ${CONVERSATION_COLS} FROM conversations ORDER BY is_pinned DESC, imported_at DESC`,
  );
}

export async function getConversation(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<ConversationRow | null> {
  const row = await db.getFirstAsync<ConversationRow>(
    `SELECT ${CONVERSATION_COLS} FROM conversations WHERE id = ?`,
    [id],
  );
  return row ?? null;
}

export async function setConversationPinned(
  db: SQLite.SQLiteDatabase,
  id: number,
  pinned: boolean,
): Promise<void> {
  await db.runAsync('UPDATE conversations SET is_pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
}

export async function getMessages(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
): Promise<MessageRow[]> {
  return db.getAllAsync<MessageRow>(
    'SELECT id, conversation_id, timestamp_ms, sender_name, body, type FROM messages WHERE conversation_id = ? ORDER BY timestamp_ms ASC',
    [conversationId],
  );
}

export async function deleteConversation(
  db: SQLite.SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
}

export type ChapterRow = {
  id: number;
  conversation_id: number;
  title: string;
  start_message_id: number;
  end_message_id: number;
  summary: string | null;
  generated_at: number;
  model_used: string | null;
  category: string | null;
  is_favorite: number; // 0 or 1 - ⭐ 重要な会話
  is_heart: number;    // 0 or 1 - 💗 心の栄養素
};

export type ChapterInput = {
  title: string;
  start_message_id: number;
  end_message_id: number;
  summary: string;
  category?: string;
};

const CHAPTER_COLS = 'id, conversation_id, title, start_message_id, end_message_id, summary, generated_at, model_used, category, is_favorite, is_heart';

/** 既存の章を全削除し、新しい章を一括保存する。既存のお気に入りは保持しない（再分類時は作り直し）。 */
export async function replaceChapters(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
  chapters: ChapterInput[],
  modelUsed: string,
): Promise<void> {
  const generatedAt = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM chapters WHERE conversation_id = ?', [conversationId]);
    for (const ch of chapters) {
      await db.runAsync(
        'INSERT INTO chapters (conversation_id, title, start_message_id, end_message_id, summary, generated_at, model_used, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [conversationId, ch.title, ch.start_message_id, ch.end_message_id, ch.summary, generatedAt, modelUsed, ch.category ?? null],
      );
    }
  });
}

export async function listChapters(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
): Promise<ChapterRow[]> {
  return db.getAllAsync<ChapterRow>(
    `SELECT ${CHAPTER_COLS} FROM chapters WHERE conversation_id = ? ORDER BY start_message_id ASC`,
    [conversationId],
  );
}

export async function getChapter(
  db: SQLite.SQLiteDatabase,
  chapterId: number,
): Promise<ChapterRow | null> {
  const row = await db.getFirstAsync<ChapterRow>(
    `SELECT ${CHAPTER_COLS} FROM chapters WHERE id = ?`,
    [chapterId],
  );
  return row ?? null;
}

export async function setChapterFavorite(
  db: SQLite.SQLiteDatabase,
  chapterId: number,
  isFavorite: boolean,
): Promise<void> {
  await db.runAsync('UPDATE chapters SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, chapterId]);
}

export async function setChapterHeart(
  db: SQLite.SQLiteDatabase,
  chapterId: number,
  isHeart: boolean,
): Promise<void> {
  await db.runAsync('UPDATE chapters SET is_heart = ? WHERE id = ?', [isHeart ? 1 : 0, chapterId]);
}

export type CategoryCount = { category: string; count: number };

export async function countChaptersByCategory(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
): Promise<CategoryCount[]> {
  return db.getAllAsync<CategoryCount>(
    `SELECT COALESCE(category, 'その他') AS category, COUNT(*) AS count
     FROM chapters WHERE conversation_id = ?
     GROUP BY COALESCE(category, 'その他')
     ORDER BY count DESC`,
    [conversationId],
  );
}

export async function getMessagesInRange(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
  startMessageId: number,
  endMessageId: number,
): Promise<MessageRow[]> {
  return db.getAllAsync<MessageRow>(
    'SELECT id, conversation_id, timestamp_ms, sender_name, body, type FROM messages WHERE conversation_id = ? AND id >= ? AND id <= ? ORDER BY timestamp_ms ASC',
    [conversationId, startMessageId, endMessageId],
  );
}

export type MessageWithMedia = MessageRow & { media: MediaRow[] };

/** 複数メッセージに紐づくメディアをまとめて取得し、メッセージに添えて返す。 */
async function attachMedia(
  db: SQLite.SQLiteDatabase,
  messages: MessageRow[],
): Promise<MessageWithMedia[]> {
  if (messages.length === 0) return [];
  const ids = messages.map(m => m.id);
  // SQLiteの変数上限は1000弱。それを超えるときはチャンクで取得する
  const CHUNK = 500;
  const byMsgId = new Map<number, MediaRow[]>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const placeholders = slice.map(() => '?').join(',');
    const rows = await db.getAllAsync<MediaRow>(
      `SELECT id, message_id, kind, local_path, width, height FROM media_refs WHERE message_id IN (${placeholders})`,
      slice,
    );
    for (const r of rows) {
      if (!byMsgId.has(r.message_id)) byMsgId.set(r.message_id, []);
      byMsgId.get(r.message_id)!.push(r);
    }
  }
  return messages.map(m => ({ ...m, media: byMsgId.get(m.id) ?? [] }));
}

export async function getMessagesWithMedia(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
): Promise<MessageWithMedia[]> {
  const msgs = await getMessages(db, conversationId);
  return attachMedia(db, msgs);
}

export async function getMessagesInRangeWithMedia(
  db: SQLite.SQLiteDatabase,
  conversationId: number,
  startMessageId: number,
  endMessageId: number,
): Promise<MessageWithMedia[]> {
  const msgs = await getMessagesInRange(db, conversationId, startMessageId, endMessageId);
  return attachMedia(db, msgs);
}
