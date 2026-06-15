// 開発用クイックテスト: node scripts/test-parser.mjs
// Latin-1二重エンコーディング復元のロジックだけをインライン検証する。

function fixMessengerEncoding(raw) {
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

let pass = 0, fail = 0;
function expect(label, actual, expected) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`OK   ${label}`); }
  else { fail++; console.log(`FAIL ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

// "こんにちは" の UTF-8 バイト列 E3 81 93 E3 82 93 E3 81 AB E3 81 A1 E3 81 AF を
// 1バイトずつ U+00XX にマップした文字列（これが Messenger JSON に書かれる形）
const konnichiwaEnc = '\u00e3\u0081\u0093\u00e3\u0082\u0093\u00e3\u0081\u00ab\u00e3\u0081\u00a1\u00e3\u0081\u00af';
expect('こんにちは', fixMessengerEncoding(konnichiwaEnc), 'こんにちは');

// "アリス" = E3 82 A2 E3 83 AA E3 82 B9
const arisuEnc = '\u00e3\u0082\u00a2\u00e3\u0083\u00aa\u00e3\u0082\u00b9';
expect('アリス', fixMessengerEncoding(arisuEnc), 'アリス');

// ASCIIは変わらないことを確認
expect('ASCII passthrough', fixMessengerEncoding('hello'), 'hello');

// 絵文字 "😀" = F0 9F 98 80（4バイト）も復元できる
const smileEnc = '\u00f0\u009f\u0098\u0080';
expect('絵文字 😀', fixMessengerEncoding(smileEnc), '😀');

console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
