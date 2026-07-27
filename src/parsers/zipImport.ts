// Facebookから出力される Messenger エクスポートZIPを扱うモジュール。
// ZIP内をスキャンして会話フォルダ一覧を返し、選択された会話だけを展開する。

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

import { fixMessengerEncoding } from './encoding';
import { parseMessengerJson, type ParsedConversation } from './messengerJsonParser';

export type ConversationInZip = {
  folderPath: string;         // ZIP内のフォルダパス（末尾スラッシュなし）
  title: string;              // 表示用タイトル（復号済み）
  messageFileCount: number;   // message_1.json 等が何個あるか
  lastMessageAt: number | null;
};

/** ZIPファイル（ローカルURI）を読み込んで JSZip オブジェクトにする。 */
export async function openZipFromUri(uri: string): Promise<JSZip> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return JSZip.loadAsync(base64, { base64: true });
}

/** ZIP内にあるすべての Messenger 会話フォルダを列挙する。 */
export async function scanConversations(zip: JSZip): Promise<ConversationInZip[]> {
  // conversationフォルダ → そこに含まれる message_*.json のパス一覧
  const folderMap = new Map<string, string[]>();

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    // Facebookの出力は messages/(inbox|archived_threads|message_requests|e2ee_cutover)/<folder>/message_N.json
    // ルート直下かもしれないし your_facebook_activity/ の下にあるかもしれない
    const match = relativePath.match(
      /(?:^|\/)messages\/(?:inbox|archived_threads|message_requests|e2ee_cutover|filtered_threads)\/([^/]+)\/message_\d+\.json$/,
    );
    if (!match) return;
    const convFolder = relativePath.substring(0, relativePath.lastIndexOf('/'));
    if (!folderMap.has(convFolder)) folderMap.set(convFolder, []);
    folderMap.get(convFolder)!.push(relativePath);
  });

  const result: ConversationInZip[] = [];
  for (const [folder, files] of folderMap.entries()) {
    files.sort();
    try {
      const content = await zip.file(files[0])!.async('string');
      const raw = JSON.parse(content);
      const title = raw.title ? fixMessengerEncoding(raw.title) : (folder.split('/').pop() ?? folder);
      const lastTs = Array.isArray(raw.messages) && raw.messages.length > 0
        ? Math.max(...raw.messages.map((m: { timestamp_ms?: number }) => m.timestamp_ms ?? 0))
        : null;
      result.push({
        folderPath: folder,
        title,
        messageFileCount: files.length,
        lastMessageAt: lastTs,
      });
    } catch {
      // 壊れたJSONはスキップ
    }
  }

  // 最新メッセージが新しい順に
  result.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  return result;
}

/**
 * 選択した会話フォルダを読み込み、分割された message_N.json を統合して
 * メディアファイルを端末に展開する。展開後のメディアローカルパスで
 * ParsedConversation を返す。
 */
export async function importConversationFromZip(
  zip: JSZip,
  folderPath: string,
  onProgress?: (msg: string) => void,
): Promise<ParsedConversation> {
  // 対象フォルダの message_*.json をすべて集める
  const jsonFiles: string[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    if (path.startsWith(folderPath + '/') && /\/message_\d+\.json$/.test(path)) {
      jsonFiles.push(path);
    }
  });
  jsonFiles.sort();

  if (jsonFiles.length === 0) {
    throw new Error('会話フォルダにJSONが見つかりませんでした');
  }

  onProgress?.(`${jsonFiles.length} 個のJSONを読み込み中...`);

  let merged: ParsedConversation | null = null;
  for (const path of jsonFiles) {
    const content = await zip.file(path)!.async('string');
    const parsed = parseMessengerJson(content);
    if (!merged) merged = parsed;
    else merged.messages.push(...parsed.messages);
  }
  if (!merged) throw new Error('パース失敗');

  merged.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

  // メディアを端末ストレージに書き出す
  const baseDir = FileSystem.documentDirectory + 'chatviewer-media/';
  await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  const convDir = baseDir + Date.now() + '/';
  await FileSystem.makeDirectoryAsync(convDir, { intermediates: true });

  // ZIP内で media.uri にマッチするファイルを探す関数。
  // JSONの media.uri は `messages/inbox/FOO/photos/1.jpg` のような相対パスで、
  // ZIP側では `your_facebook_activity/messages/inbox/FOO/photos/1.jpg` の
  // 場合があるので、複数のプレフィックスを試す。
  function findInZip(refUri: string): JSZip.JSZipObject | null {
    const candidates = [
      refUri,
      'your_facebook_activity/' + refUri,
    ];
    // folderPath から推測（messages/inbox/FOO → その2つ上）
    const idx = folderPath.indexOf('messages/');
    if (idx > 0) {
      candidates.push(folderPath.slice(0, idx) + refUri);
    }
    for (const c of candidates) {
      const f = zip.file(c);
      if (f) return f;
    }
    return null;
  }

  const totalMedia = merged.messages.reduce((n, m) => n + m.media.length, 0);
  if (totalMedia === 0) {
    onProgress?.(`${merged.messages.length} 件のメッセージを保存中...`);
  } else {
    onProgress?.(`メディア 0 / ${totalMedia} 件を展開中...`);
  }

  let done = 0;
  for (const msg of merged.messages) {
    for (const media of msg.media) {
      const file = findInZip(media.uri);
      if (!file) continue;
      const safeName = media.uri.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localPath = convDir + safeName;
      try {
        const b64 = await file.async('base64');
        await FileSystem.writeAsStringAsync(localPath, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        media.uri = localPath;
      } catch {
        // 個別失敗は無視（表示時にフォールバック）
      }
      done++;
      // 細かく進捗を出して、止まってないことが分かるようにする
      if (totalMedia > 0 && done % 3 === 0) {
        const pct = Math.floor((done / totalMedia) * 100);
        onProgress?.(`メディア ${done} / ${totalMedia} 件を展開中... (${pct}%)`);
      }
    }
  }

  onProgress?.('もう少しで完了 ✦ 保存中...');
  return merged;
}
