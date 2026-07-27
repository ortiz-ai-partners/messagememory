// SQLiteスキーマとマイグレーション。
// PRAGMA user_version で現在のスキーマバージョンを管理し、
// 新しいマイグレーションを順次適用する。

export const MIGRATIONS: string[] = [
  // v1: 初期スキーマ
  `
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      participant_count INTEGER NOT NULL,
      imported_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      timestamp_ms INTEGER NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT,
      type TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, timestamp_ms);

    CREATE TABLE IF NOT EXISTS media_refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      local_path TEXT NOT NULL,
      width INTEGER,
      height INTEGER
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_message_id INTEGER NOT NULL,
      end_message_id INTEGER NOT NULL,
      summary TEXT,
      generated_at INTEGER NOT NULL,
      model_used TEXT
    );
  `,

  // v2: 章にカテゴリとお気に入りを追加
  `
    ALTER TABLE chapters ADD COLUMN category TEXT;
    ALTER TABLE chapters ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
  `,

  // v3: 2種類目のお気に入り（心の栄養素）を追加。
  // is_favorite = 重要な会話（⭐）、is_heart = 心の栄養素（💗）として用途分離する。
  `
    ALTER TABLE chapters ADD COLUMN is_heart INTEGER NOT NULL DEFAULT 0;
  `,

  // v4: 会話のピン留めを追加（スワイプ操作で切り替える）
  `
    ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
  `,

  // v5: 会話ごとのAI感想（カテゴリ分布画面で表示するためのキャッシュ）
  `
    ALTER TABLE conversations ADD COLUMN ai_commentary TEXT;
    ALTER TABLE conversations ADD COLUMN ai_commentary_at INTEGER;
  `,

  // v6: 本棚に並ぶ各本の「背表紙の色」。null の場合はテーマのデフォルト色を使う。
  `
    ALTER TABLE conversations ADD COLUMN color TEXT;
  `,

  // v7: アプリレベルのKey-Valueメタデータ（本棚全体のAI感想キャッシュ等）
  `
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    );
  `,
];
