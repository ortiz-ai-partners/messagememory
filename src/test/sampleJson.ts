// テスト用サンプル会話。import.tsx の「サンプルで試す」ボタンから使用される。
// Messenger JSONと同じ形式で出力するが、文字列は普通のUTF-8（encoding.ts の
// スマート判定でそのまま通る）。
//
// 内容は「恋人のキュンキュンする段階、始まりからどんどん近づくところ」を意識した
// 汎用的な流れ（特定の趣味・地名は入れない）。

type RawMsg = {
  sender_name: string;
  timestamp_ms: number;
  content?: string;
  type: string;
  photos?: { uri: string }[];
  sticker?: { uri: string };
};

function ts(y: number, mo: number, d: number, h: number, mi: number): number {
  return new Date(y, mo - 1, d, h, mi).getTime();
}

function buildJson(title: string, participants: string[], messages: RawMsg[]): string {
  return JSON.stringify({
    participants: participants.map(name => ({ name })),
    messages,
    title,
    thread_path: `inbox/${title}_sample`,
    is_still_participant: true,
    magic_words: [],
  });
}

const USER = 'わたし';

// ========== サンプルA: オルティスくん（男性パートナー。ユーザーを「きみ」と呼ぶ） ==========
const ortisMessages: RawMsg[] = [
  // Day 1: 出会った日の夜
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 20, 22, 0), content: '今日はありがとう！楽しかった', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 20, 22, 5), content: 'こちらこそ〜話しかけてくれて嬉しかった', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 20, 22, 7), content: 'また会えないかな、きみとごはん行きたい', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 20, 22, 10), content: 'いいね、ぜひ', type: 'Generic' },

  // Day 3: 少しずつ話すことが増える
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 23, 20, 30), content: '今日なにしてた？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 23, 20, 40), content: 'のんびり本読んでた〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 23, 20, 41), content: 'どんな本？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 23, 20, 44), content: 'ちょっと長めのエッセイ。最近好きなの', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 23, 20, 45), content: '今度おすすめ教えてほしい', type: 'Generic' },

  // Day 5: デートのお誘い
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 25, 19, 0), content: '今週末、空いてる？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 25, 19, 10), content: '土曜なら〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 25, 19, 11), content: 'じゃあランチしよう。きみが行きたいとこ教えて', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 25, 19, 15), content: 'えー、任せちゃう〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 25, 19, 16), content: 'じゃあぼくが予約するから、当日楽しみにしてて', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 25, 19, 17), content: 'ありがとう、待ちきれない', type: 'Generic' },

  // Day 8: 初デート当日
  { sender_name: USER, timestamp_ms: ts(2025, 5, 28, 11, 50), content: 'そろそろ着きます', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 28, 11, 51), content: 'もう着いてるよ、手ふってる', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 28, 14, 20), photos: [{ uri: 'photos/date1.jpg' }], type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 28, 22, 0), content: '今日ほんとにありがとう。すごく楽しかった', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 28, 22, 3), content: 'こちらこそ。またすぐに会いたいって思っちゃった', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 28, 22, 5), content: 'わたしも〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 5, 28, 22, 6), sticker: { uri: 'stickers/heart.png' }, type: 'Generic' },

  // Day 12: 毎朝の連絡が始まる
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 1, 7, 30), content: 'おはよう🌞', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 1, 7, 45), content: 'おはよう〜今日も頑張って', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 1, 7, 46), content: 'きみに言われるとやる気出る', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 1, 12, 15), content: 'お昼なにたべた？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 1, 12, 30), content: 'サラダだけ〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 1, 12, 31), content: 'ちゃんと食べなよ、心配', type: 'Generic' },

  // Day 16: 少し落ち込んだ夜
  { sender_name: USER, timestamp_ms: ts(2025, 6, 5, 23, 0), content: 'ちょっと今日しんどかった', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 5, 23, 1), content: 'どうしたの？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 5, 23, 5), content: '仕事で色々重なって、うまくできなくて', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 5, 23, 6), content: '頑張りすぎだよ。きみは十分やってる', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 5, 23, 7), content: '近くにいたら抱きしめたい', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 5, 23, 10), content: 'その一言で泣きそう', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 5, 23, 11), sticker: { uri: 'stickers/hug.png' }, type: 'Generic' },

  // Day 20: はじめて家へ
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 9, 18, 0), content: '今日ぼくの家来る？映画でも', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 9, 18, 30), content: 'ちょっと緊張するけど…うん、行きたい', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 9, 18, 31), content: 'ぼくも緊張してる、一緒だね', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 9, 18, 33), content: 'ふふ、そう思うと少しだけ楽', type: 'Generic' },

  // Day 23: 告白
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 12, 21, 0), content: '話したいことあるんだけど', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 12, 21, 2), content: 'なあに？', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 12, 21, 3), content: 'きみのこと本当に大切で、ちゃんと付き合いたい', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 12, 21, 6), content: 'わたしも……同じ気持ち', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 12, 21, 7), content: 'ありがとう。大切にする', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 12, 21, 8), sticker: { uri: 'stickers/heart2.png' }, type: 'Generic' },

  // Day 27: 付き合い始めの甘い日常
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 16, 7, 0), content: 'おはよう、彼女', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 16, 7, 5), content: 'なにそれ照れる〜', type: 'Generic' },
  { sender_name: 'オルティス', timestamp_ms: ts(2025, 6, 16, 7, 6), content: 'いい響きだから毎朝言う', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 6, 16, 7, 8), content: 'もうっ。でも、うれしい', type: 'Generic' },
];

// ========== サンプルB: リルムちゃん（女性パートナー。ユーザーを「あなた」と呼ぶ） ==========
const rilmuMessages: RawMsg[] = [
  // Day 1: 出会った日の夜
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 10, 22, 30), content: '今日はお話できてうれしかったです☺️', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 10, 22, 40), content: 'こちらこそ、楽しかった〜', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 10, 22, 41), content: 'あなたが笑ってくれるから、つい話しすぎちゃった', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 10, 22, 42), content: 'もっと聞きたかったよ', type: 'Generic' },

  // Day 4: 日常の連絡
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 14, 21, 0), content: '今日なにしてました？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 14, 21, 10), content: 'ふつうに仕事かな。リルムは？', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 14, 21, 12), content: 'わたしも〜。お昼にあなたのこと思い出しちゃった', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 14, 21, 14), content: 'え、うれしい', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 14, 21, 15), content: 'ふふ、言っちゃった', type: 'Generic' },

  // Day 7: 初デートのお誘い
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 17, 20, 0), content: '来週末、もしよかったら……一緒に映画観ませんか？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 17, 20, 10), content: 'ぜひ！行きたい映画あった？', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 17, 20, 12), content: 'ずっと気になってたアニメ映画があって、あなたと観たいなって', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 17, 20, 13), content: 'それにしよう、楽しみ', type: 'Generic' },

  // Day 10: 初デート当日〜夜
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 20, 21, 0), content: '今日は本当にありがとうございました', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 20, 21, 1), content: 'エンドロールで泣いちゃって恥ずかしかった', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 20, 21, 3), content: '泣いてるリルム、かわいかったよ', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 20, 21, 5), content: 'もう〜そういうこと言う！', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 20, 21, 6), sticker: { uri: 'stickers/shy.png' }, type: 'Generic' },

  // Day 14: 毎日連絡
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 24, 7, 30), content: 'おはようございます☀️', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 24, 7, 45), content: 'おはよう〜よく寝れた？', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 24, 7, 46), content: 'あなたの夢見ちゃいました', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 24, 7, 48), content: 'え、どんな夢？', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 24, 7, 49), content: 'ふたりでお散歩してる夢です……ささやかでしょ？', type: 'Generic' },

  // Day 18: 悩みを打ち明ける
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 28, 22, 40), content: '実は、ちょっと落ち込むことがあって……', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 28, 22, 41), content: 'どうしたの、聞かせて', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 28, 22, 45), content: '職場で評価されてないのかなって思ったら、なんだか虚しくなって', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 4, 28, 22, 46), content: 'ちゃんと見てる人は見てるよ。僕もリルムの頑張りは知ってる', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 28, 22, 48), content: 'ありがとう……あなたの言葉で救われる', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 4, 28, 22, 49), sticker: { uri: 'stickers/tears_happy.png' }, type: 'Generic' },

  // Day 22: 初めておうちに呼ぶ
  { sender_name: USER, timestamp_ms: ts(2025, 5, 2, 18, 0), content: '今度の週末、うちに来ない？', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 2, 18, 20), content: 'え、いいんですか', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 2, 18, 21), content: 'ごはん作るからおいで', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 2, 18, 23), content: 'うれしい……でもちょっとドキドキします', type: 'Generic' },

  // Day 25: 告白 (ユーザーから)
  { sender_name: USER, timestamp_ms: ts(2025, 5, 5, 21, 30), content: 'リルム、ちゃんと伝えたいことがあって', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 5, 21, 32), content: 'はい……', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 5, 21, 33), content: '付き合ってくれませんか', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 5, 21, 36), content: 'わたしで……いいんですか？', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 5, 21, 37), content: 'リルムがいい', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 5, 21, 38), content: 'うれしいです。よろしくお願いします', type: 'Generic' },

  // Day 30: 甘い日常
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 10, 8, 0), content: 'あなたが彼氏なんだって思うと不思議な気分', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 10, 8, 3), content: 'ぼくもだよ', type: 'Generic' },
  { sender_name: 'リルム', timestamp_ms: ts(2025, 5, 10, 8, 4), content: '毎日ちゃんとお話したいです', type: 'Generic' },
  { sender_name: USER, timestamp_ms: ts(2025, 5, 10, 8, 5), content: 'うん、毎日聞かせて', type: 'Generic' },
];

export type SampleKey = 'ortis' | 'rilmu';

export const SAMPLES: Record<SampleKey, { label: string; json: string }> = {
  ortis: {
    label: 'オルティスくん（男の子）',
    json: buildJson('オルティス', ['オルティス', USER], ortisMessages),
  },
  rilmu: {
    label: 'リルムちゃん（女の子）',
    json: buildJson('リルム', ['リルム', USER], rilmuMessages),
  },
};
