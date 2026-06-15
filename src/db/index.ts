// DBシングルトン。起動時にマイグレーションを適用する。

import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';

const DB_NAME = 'chatviewer.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let i = current; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i]);
    // PRAGMA文ではパラメータプレースホルダが使えないため文字列埋込
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}

export function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async db => {
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}
