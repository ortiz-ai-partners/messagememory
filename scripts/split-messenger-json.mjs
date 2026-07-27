// Messenger のエクスポート JSON を月ごとに分割するユーティリティ
//
// 使い方:
//   node scripts/split-messenger-json.mjs <path-to-message_1.json>
//
// 元の JSON があるディレクトリに月ごとのファイル (<title>_YYYY-MM.json) を出力する。
// 各ファイルは元と同じ Messenger JSON 構造（participants, title, messages...）を持ち、
// そのままアプリの「ファイルを選ぶ」から個別に取り込める。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Latin-1 二重エンコ → UTF-8 復元（表示用のみ。ファイル中身はそのまま透過）
function fixEncoding(raw) {
  if (typeof raw !== 'string' || !raw) return raw;
  let hasHighByte = false;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code > 0xff) return raw;
    if (code > 0x7f) hasHighByte = true;
  }
  if (!hasHighByte) return raw;
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return raw;
  }
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('使い方: node scripts/split-messenger-json.mjs <path-to-message_1.json>');
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`ファイルが見つかりません: ${inputPath}`);
  process.exit(1);
}

console.log(`📂 読み込み中: ${inputPath}`);
const raw = readFileSync(inputPath, 'utf-8');
const data = JSON.parse(raw);

// 別形式（threadName + senderName + timestamp）にも対応
const tsField = data.messages?.[0]?.timestamp_ms != null ? 'timestamp_ms' : 'timestamp';
const title = data.title || data.threadName || 'conversation';
const displayTitle = fixEncoding(title);

console.log(`📋 タイムスタンプフィールド: ${tsField}`);
// ファイル名に使える文字だけに（日本語・英数字・記号一部 OK）
const safeName = displayTitle
  .replace(/[/\\?%*:|"<>]/g, '_')
  .replace(/\s+/g, '_')
  .slice(0, 40);

if (!Array.isArray(data.messages)) {
  console.error('JSON の "messages" 配列が見つかりません');
  process.exit(1);
}

const participants = (data.participants || []).map((p) =>
  fixEncoding(typeof p === 'string' ? p : p.name),
).join(', ');
console.log(`👥 会話: ${displayTitle} (${participants})`);
console.log(`💬 全メッセージ数: ${data.messages.length}`);

// 月ごとにグループ化
const buckets = new Map();
let withoutTs = 0;
for (const m of data.messages) {
  const ts = m[tsField];
  if (!ts) {
    withoutTs++;
    continue;
  }
  const d = new Date(ts);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!buckets.has(ym)) buckets.set(ym, []);
  buckets.get(ym).push(m);
}

if (withoutTs > 0) {
  console.log(`⚠️ タイムスタンプ無しメッセージ ${withoutTs} 件 → スキップ`);
}

const sortedKeys = Array.from(buckets.keys()).sort();
if (sortedKeys.length === 0) {
  console.error('分割可能なメッセージがありません');
  process.exit(1);
}

// 出力先：元ファイルの隣に split_<元ファイル名>/ ディレクトリを作る
const baseDir = dirname(inputPath);
const outDir = join(baseDir, `split_${safeName}`);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log(`\n📅 月ごとの分割:`);
console.log(`📁 出力先: ${outDir}\n`);

for (const ym of sortedKeys) {
  const messages = buckets.get(ym).sort((a, b) => a[tsField] - b[tsField]);
  const output = {
    ...data,
    messages,
  };
  const outPath = join(outDir, `${safeName}_${ym}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`  ${ym}: ${String(messages.length).padStart(4)} 件 → ${safeName}_${ym}.json`);
}

console.log(`\n✓ 完了: ${sortedKeys.length} ファイル生成`);
console.log(`\nアプリの「インポート → ファイルを選ぶ」で月別 JSON を順に取り込めます。`);
