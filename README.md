# MessageMemory

> 大切な人とのメッセージを、一冊の本のように残せるアプリ。

Facebook Messenger の会話履歴を取り込み、AIが話題ごとに自動で章立て。  
写真・スタンプもまるごと残せて、いつでも好きなトピックを読み返せる「思い出の本棚」アプリです。

---

## コンセプト

LINEやMessengerの会話を時系列で見返すのって、なんだか疲れますよね。  
**MessageMemory** は、その会話を **「話題ごと」「思い出ごと」** に整理して、いつでも好きなページを開ける本のように扱います。

ターゲットは、恋人や家族、大切な誰かとのやり取りを**思い出として保存・再体験したい人**。  
端末内で完結する設計で、会話は外に出ません。

## 主要機能

- **AI章分け**: Claude（Anthropic API）が会話を読み、話題ごとに自動で章を作成。情緒的な章タイトルを付与。
- **カテゴリ自動分類**: 雑談 / デート・お出かけ / 大切な出来事 / 旅行 / 記念日 / 日常の報告 / 相談ごと / その他 の8カテゴリに分類。
- **2種類のお気に入り**: ⭐重要な会話 と 💗心の栄養素 — 用途を分けて記憶。
- **カテゴリ別絞り込み**: 「デートだけ見たい」「相談ごとだけ見返したい」ですぐ抽出。
- **会話グラフ**: 円グラフでカテゴリ分布を可視化。
- **写真・スタンプのインライン表示**: ZIPから自動展開して吹き出しに直接表示。
- **会話相手の選択**: Messenger エクスポートZIPから、取り込みたい相手の会話だけを選んで保存。
- **ピン留め・スワイプ削除**: 大切な会話は上部固定、不要なものは左スワイプで削除。
- **BYOK**: ユーザー自身の Anthropic API キーを使う方式。会話データは端末から出ません。
- **木目調UI**: クリーム色の紙と蜂蜜色のアクセントで、本棚を眺めるような温かい体験。

## 技術スタック

| レイヤ | 採用 |
|---|---|
| フレームワーク | React Native + Expo (SDK 54) |
| 言語 | TypeScript |
| ルーティング | Expo Router (file-based) |
| 状態管理 | Zustand |
| ローカルDB | expo-sqlite（マイグレーション対応） |
| AI | Claude Haiku 4.5（Anthropic SDK、BYOK） |
| セキュアストア | expo-secure-store（APIキー保管） |
| ファイル入出力 | expo-document-picker, expo-file-system, JSZip |
| 画像表示 | expo-image |
| グラフィック | react-native-svg（円グラフ・木目テクスチャ） |
| ジェスチャ | react-native-gesture-handler（スワイプ操作） |
| 配信予定 | Apple Developer Program（App Store） |

## 開発者向けセットアップ

### 必要環境

- Node.js LTS（v22 以上推奨）
- iOS実機 もしくは Expo Go（開発時）
- Anthropic API キー（章分け機能を動かす場合）

### セットアップ手順

```bash
# 1. クローン
git clone https://github.com/ortiz-ai-partners/messagememory.git
cd messagememory

# 2. 依存解決
npm install

# 3. dev server 起動
npx expo start
```

QRコードが表示されたら、iPhone のカメラアプリでスキャンして Expo Go で開きます。  
初回起動時にオンボーディング（性別選択）が走り、その後「会話」タブからインポートできます。

### サンプルデータで試す

実データが無くてもOK。「インポート」画面から：

- 🧪 **オルティスくん** （男性パートナーとの恋愛キュンキュン進行サンプル）
- 🧪 **リルムちゃん** （女性パートナーとの恋愛キュンキュン進行サンプル）

をワンタップで取り込み、AI章分けの動作確認ができます。

### 実データでのインポート

1. Facebookの [Download Your Information](https://www.facebook.com/dyi/) で、**メッセージのみ**を **JSON形式** でエクスポート
2. ZIPファイルが手に入ったら、アプリの「インポート」→「ファイルを選ぶ」で選択
3. 検出された会話一覧から、取り込みたい相手を1つ選択
4. 会話と写真・スタンプが自動で展開・保存される
5. 一覧から会話を開き、ヘッダー右上の「**記憶に分ける**」をタップで AI章分けが走る

### 注意事項

- 大容量のZIP（数百MB〜GB）はExpo Goでメモリ不足で落ちます。期間を区切って再エクスポートするか、PC側で先に展開して `message_*.json` を直接渡してください。
- AI章分けには Anthropic API キーが必要です（「設定」タブから登録）。

## プロジェクト構造

```
.
├── app/                       # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx          # 会話一覧
│   │   └── settings.tsx       # BYOK 設定
│   ├── conversation/[id].tsx  # 会話詳細（章一覧 or タイムライン）
│   ├── chapter/[id].tsx       # 章詳細（メッセージ）
│   ├── stats/[id].tsx         # カテゴリ分布円グラフ
│   ├── import.tsx             # インポート画面（ZIP / JSON）
│   └── onboarding.tsx         # 初回オンボーディング
├── src/
│   ├── parsers/               # JSON & ZIP パーサ、Latin-1 修正
│   ├── db/                    # SQLite スキーマ・クエリ
│   ├── ai/                    # Claude API 章分け
│   ├── secrets/               # APIキー / 設定の保管
│   └── test/                  # サンプル会話データ
├── components/                # UI コンポーネント
├── constants/                 # テーマ（木目調パレット）
└── hooks/                     # useTheme など
```

## ライセンス

Copyright (c) 2026 ortiz-ai-partners. All Rights Reserved.

詳細は [LICENSE](./LICENSE) を参照してください。

---

🌱 個人開発、App Store リリース準備中です。
