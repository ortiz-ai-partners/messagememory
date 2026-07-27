// Facebook Messengerの "Download Your Information" で出力されるJSONを
// パースする。文字列は Latin-1 二重エンコーディングされているため復元する。
//
// 典型的な構造:
// {
//   "participants": [{"name": "Alice"}, {"name": "Bob"}],
//   "messages": [
//     {"sender_name": "Alice", "timestamp_ms": 1234, "content": "hi", "type": "Generic"},
//     {"sender_name": "Bob", "timestamp_ms": 1235, "photos": [{"uri": "..."}], "type": "Generic"},
//     {"sender_name": "Bob", "timestamp_ms": 1236, "sticker": {"uri": "..."}, "type": "Generic"}
//   ],
//   "title": "Alice",
//   "thread_path": "inbox/Alice_XXXX"
// }

import { fixMessengerEncoding } from './encoding';

export type MessageType = 'text' | 'photo' | 'sticker' | 'gif' | 'video' | 'share' | 'other';

export type ParsedMessage = {
  timestamp_ms: number;
  sender_name: string;
  body: string | null;
  type: MessageType;
  media: { kind: 'photo' | 'sticker' | 'gif' | 'video'; uri: string }[];
};

export type ParsedConversation = {
  title: string;
  participants: string[];
  messages: ParsedMessage[];
  thread_path: string | null;
};

// Facebook JSONの生データ型（必要な部分だけ）
type RawMessage = {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  type?: string;
  photos?: { uri: string }[];
  sticker?: { uri: string };
  gifs?: { uri: string }[];
  videos?: { uri: string }[];
  share?: { link?: string; share_text?: string };
};

type RawExport = {
  participants?: { name: string }[];
  messages?: RawMessage[];
  title?: string;
  thread_path?: string;
};

// 他ツール / Meta 新形式: participants は文字列配列、フィールド名が camelCase
type AltMessage = {
  senderName?: string;
  timestamp?: number;
  text?: string;
  type?: string;
  media?: { uri: string }[];
  isUnsent?: boolean;
};

type AltExport = {
  participants?: (string | { name: string })[];
  messages?: AltMessage[];
  threadName?: string;
  title?: string;
  thread_path?: string;
};

function classifyMediaUri(uri: string): 'photo' | 'sticker' | 'gif' | 'video' {
  const ext = uri.toLowerCase().split('.').pop() ?? '';
  if (ext === 'gif') return 'gif';
  if (ext === 'mp4' || ext === 'mov' || ext === 'm4v') return 'video';
  if (ext === 'webp') return 'sticker';
  return 'photo';
}

function normalizeAltMessage(m: AltMessage): RawMessage {
  const media = m.media ?? [];
  const photos: { uri: string }[] = [];
  const gifs: { uri: string }[] = [];
  const videos: { uri: string }[] = [];
  let sticker: { uri: string } | undefined;

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

/** 標準FBフォーマットでなければ正規化する */
function normalizeRawExport(raw: AltExport | RawExport): RawExport {
  const participants = raw.participants ?? [];
  // Facebook 標準: participants が {name} オブジェクトの配列
  const isStandardFormat =
    participants.length > 0 && typeof (participants[0] as { name?: string }).name === 'string';

  if (isStandardFormat) {
    return raw as RawExport;
  }

  // 別形式 → 標準形に変換
  const alt = raw as AltExport;
  return {
    title: alt.threadName ?? alt.title,
    participants: (alt.participants ?? []).map(p =>
      typeof p === 'string' ? { name: p } : p,
    ),
    messages: (alt.messages ?? []).map(normalizeAltMessage),
    thread_path: alt.thread_path,
  };
}

function fix(s: string | undefined | null): string {
  if (s == null) return '';
  return fixMessengerEncoding(s);
}

function detectType(raw: RawMessage): MessageType {
  if (raw.photos && raw.photos.length > 0) return 'photo';
  if (raw.sticker) return 'sticker';
  if (raw.gifs && raw.gifs.length > 0) return 'gif';
  if (raw.videos && raw.videos.length > 0) return 'video';
  if (raw.share) return 'share';
  if (raw.content) return 'text';
  return 'other';
}

function extractMedia(raw: RawMessage): ParsedMessage['media'] {
  const out: ParsedMessage['media'] = [];
  raw.photos?.forEach(p => out.push({ kind: 'photo', uri: p.uri }));
  if (raw.sticker) out.push({ kind: 'sticker', uri: raw.sticker.uri });
  raw.gifs?.forEach(g => out.push({ kind: 'gif', uri: g.uri }));
  raw.videos?.forEach(v => out.push({ kind: 'video', uri: v.uri }));
  return out;
}

export function parseMessengerJson(jsonText: string): ParsedConversation {
  const parsed = JSON.parse(jsonText);
  const raw: RawExport = normalizeRawExport(parsed);

  const title = fix(raw.title) || '✎ 名前を付けてね';
  const participants = (raw.participants ?? []).map(p => fix(p.name)).filter(Boolean);
  const thread_path = raw.thread_path ?? null;

  const messages: ParsedMessage[] = (raw.messages ?? []).map(m => {
    const body = m.content != null ? fix(m.content) : (m.share?.share_text ? fix(m.share.share_text) : null);
    return {
      timestamp_ms: m.timestamp_ms ?? 0,
      sender_name: fix(m.sender_name),
      body,
      type: detectType(m),
      media: extractMedia(m),
    };
  });

  // Messengerは新しいメッセージから順に入っているので時系列昇順に並べ替え
  messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

  return { title, participants, messages, thread_path };
}
