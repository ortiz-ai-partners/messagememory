// 別形式 JSON が parser を通った時、どんな結果になるかを確認するテストスクリプト
// node scripts/test-parse.mjs <path-to-json>

import { readFileSync } from 'node:fs';

// encoding.ts の実装をインライン化
function fixMessengerEncoding(raw) {
  if (!raw) return raw;
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

function classifyMediaUri(uri) {
  const ext = uri.toLowerCase().split('.').pop() ?? '';
  if (ext === 'gif') return 'gif';
  if (ext === 'mp4' || ext === 'mov' || ext === 'm4v') return 'video';
  if (ext === 'webp') return 'sticker';
  return 'photo';
}

function normalizeAltMessage(m) {
  const media = m.media ?? [];
  const photos = [];
  const gifs = [];
  const videos = [];
  let sticker;
  for (const med of media) {
    const kind = classifyMediaUri(med.uri);
    if (kind === 'photo') photos.push({ uri: med.uri });
    else if (kind === 'gif') gifs.push({ uri: med.uri });
    else if (kind === 'video') videos.push({ uri: med.uri });
    else if (kind === 'sticker' && !sticker) sticker = { uri: med.uri };
  }
  return {
    sender_name: m.senderName,
    timestamp_ms: m.timestamp,
    content: m.text || undefined,
    type: m.type,
    photos: photos.length > 0 ? photos : undefined,
    gifs: gifs.length > 0 ? gifs : undefined,
    videos: videos.length > 0 ? videos : undefined,
    sticker,
  };
}

function normalizeRawExport(raw) {
  const participants = raw.participants ?? [];
  const isStandardFormat =
    participants.length > 0 && typeof (participants[0]).name === 'string';
  console.log(`📋 format detection: isStandardFormat = ${isStandardFormat}`);
  console.log(`   participants[0] =`, JSON.stringify(participants[0]));
  console.log(`   participants[0].name =`, JSON.stringify(participants[0]?.name));
  console.log(`   typeof above = ${typeof participants[0]?.name}`);

  if (isStandardFormat) return raw;

  return {
    title: raw.threadName ?? raw.title,
    participants: (raw.participants ?? []).map(p =>
      typeof p === 'string' ? { name: p } : p,
    ),
    messages: (raw.messages ?? []).map(normalizeAltMessage),
    thread_path: raw.thread_path,
  };
}

function fix(s) {
  if (s == null) return '';
  return fixMessengerEncoding(s);
}

function detectType(raw) {
  if (raw.photos && raw.photos.length > 0) return 'photo';
  if (raw.sticker) return 'sticker';
  if (raw.gifs && raw.gifs.length > 0) return 'gif';
  if (raw.videos && raw.videos.length > 0) return 'video';
  if (raw.share) return 'share';
  if (raw.content) return 'text';
  return 'other';
}

function parseMessengerJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  const raw = normalizeRawExport(parsed);

  console.log(`\n📦 正規化後 raw:`);
  console.log(`   title: ${JSON.stringify(raw.title)}`);
  console.log(`   participants:`, JSON.stringify(raw.participants?.slice(0, 2)));
  console.log(`   messages.length: ${raw.messages?.length}`);
  console.log(`   messages[0]:`, JSON.stringify(raw.messages?.[0]));

  const title = fix(raw.title) || '✎ 名前を付けてね';
  const participants = (raw.participants ?? []).map(p => fix(p.name)).filter(Boolean);
  const messages = (raw.messages ?? []).map(m => {
    const body = m.content != null ? fix(m.content) : null;
    return {
      timestamp_ms: m.timestamp_ms ?? 0,
      sender_name: fix(m.sender_name),
      body,
      type: detectType(m),
    };
  });

  return { title, participants, messages };
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/test-parse.mjs <path-to-json>');
  process.exit(1);
}

const raw = readFileSync(inputPath, 'utf-8');
const result = parseMessengerJson(raw);

console.log(`\n✓ parser 結果:`);
console.log(`   title: "${result.title}"`);
console.log(`   participants: [${result.participants.map(p => `"${p}"`).join(', ')}]`);
console.log(`   messages.length: ${result.messages.length}`);
console.log(`\n💬 最初の3メッセージ:`);
result.messages.slice(0, 3).forEach((m, i) => {
  console.log(`   [${i}] ${new Date(m.timestamp_ms).toISOString()} | ${m.sender_name} | type=${m.type}`);
  console.log(`       body: ${JSON.stringify(m.body)}`);
});

console.log(`\n💬 空 body のメッセージ数:`,
  result.messages.filter(m => !m.body).length);
console.log(`💬 空 sender_name のメッセージ数:`,
  result.messages.filter(m => !m.sender_name).length);
console.log(`💬 timestamp 0 のメッセージ数:`,
  result.messages.filter(m => m.timestamp_ms === 0).length);
