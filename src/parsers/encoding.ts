// MessengerエクスポートJSONの日本語文字列は Latin-1 に二重エンコードされている。
// JSON上 "\u00e3\u0081\u0082" のように格納された文字列を正しいUTF-8に戻す。
// 例: "ã\u0081\u0082" → "あ"
//
// 既にデコード済み（普通の日本語など U+0100 以上が含まれる）文字列はそのまま返す。
// ASCIIのみの文字列もそのまま返す。これによりサンプルデータや
// 他ソースからのJSONも破壊せずに扱える。

export function fixMessengerEncoding(raw: string): string {
  if (!raw) return raw;

  let hasHighByte = false;
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code > 0xff) return raw; // 既にUTF-8として解釈済み
    if (code > 0x7f) hasHighByte = true;
  }
  if (!hasHighByte) return raw; // ASCIIのみ

  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return raw;
  }
}
