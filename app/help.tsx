import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { useTheme } from '@/hooks/use-theme';

export default function HelpScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <Stack.Screen options={{ title: '使い方' }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.lead, { color: theme.textMuted }]}>
          大切な人とのメッセージを、{'\n'}一冊の本のように残していくアプリです。
        </ThemedText>

        <Section title="📚 本棚">
          <Paragraph>
            取り込んだ会話は <ThemedText type="defaultSemiBold">本棚</ThemedText> に「1冊の本」として並びます。
            タップで開けます。
          </Paragraph>
          <Paragraph>
            <ThemedText type="defaultSemiBold">左にスワイプ</ThemedText>すると、
            📌ピン留め（上部固定）と削除ができます。
          </Paragraph>
        </Section>

        <Section title="＋ 会話の取り込み">
          <Paragraph>
            Facebook の「
            <ThemedText type="defaultSemiBold">Download Your Information</ThemedText>
            」で出力した <ThemedText type="defaultSemiBold">.zip</ThemedText> や
            <ThemedText type="defaultSemiBold"> message_*.json</ThemedText> を選んでください。
          </Paragraph>
          <Pressable
            onPress={() => Linking.openURL('https://accountscenter.facebook.com/info_and_permissions')}
            style={[styles.linkButton, { borderColor: theme.tint, backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.linkButtonText, { color: theme.tint }]}>
              🔗 Facebook「情報と権限」を開く
            </ThemedText>
          </Pressable>
          <Paragraph>
            上のリンクから「あなたの情報をダウンロード」→「メッセージ」だけを選び、
            形式は <ThemedText type="defaultSemiBold">JSON</ThemedText> を指定すると最速です。
          </Paragraph>
          <Paragraph>
            ZIPの場合は中の会話相手の一覧が表示され、取り込みたい相手だけを選べます。
            写真やスタンプも自動で展開されます。
          </Paragraph>
          <Box theme={theme}>
            <ThemedText style={styles.boxText}>
              📚 取り込むたびに本棚に「新しい1冊」が追加されます。{'\n'}
              既存の会話に上書きされたり統合されたりはしません。
            </ThemedText>
          </Box>
        </Section>

        <Section title="♢ 記憶に分ける（AI章分け）">
          <Paragraph>
            会話を開いた画面のヘッダー右上「
            <ThemedText type="defaultSemiBold">記憶に分ける</ThemedText>
            」をタップすると、AIが話題ごとに章を作って情緒的なタイトルを付けてくれます。
          </Paragraph>
          <Paragraph>
            8つのカテゴリ（雑談 / デート・お出かけ / 大切な出来事 / 旅行 / 記念日 / 日常の報告 / 相談ごと / その他）
            のいずれかに自動分類されます。
          </Paragraph>
        </Section>

        <Section title="⭐ 重要 と 💗 心の栄養素">
          <Paragraph>
            各章には2種類のお気に入りが付けられます。
          </Paragraph>
          <Paragraph>
            <ThemedText type="defaultSemiBold">⭐ 重要な会話</ThemedText> ・・・ 忘れたくない大切な記憶。{'\n'}
            <ThemedText type="defaultSemiBold">💗 心の栄養素</ThemedText> ・・・ 読み返すと元気になる記憶。
          </Paragraph>
          <Paragraph>
            会話画面のフィルタチップでそれぞれ絞り込んで表示できます。
          </Paragraph>
        </Section>

        <Section title="📊 会話グラフ">
          <Paragraph>
            会話画面の「📊 会話グラフ」から、カテゴリ分布の円グラフと、
            AIが書いた3文の感想が見られます。
          </Paragraph>
          <Paragraph>
            円グラフや凡例をタップすると、そのカテゴリだけ絞り込まれた会話の記憶に飛びます。
          </Paragraph>
        </Section>

        <Section title="📅 記憶別 / 日付別">
          <Paragraph>
            会話画面では、章ごとに見る「記憶別」と、日付ごとに見る「日付別」を切り替えられます。
            日付別では、まず日付の一覧が出てきて、タップすると展開してその日の会話が見られます。
          </Paragraph>
        </Section>

        <Section title="🔒 プライバシーとAPIキー（BYOK）">
          <Paragraph>
            会話データはすべて
            <ThemedText type="defaultSemiBold">あなたの端末の中だけ</ThemedText>に保存されます。
            外部のサーバーには送られません。
          </Paragraph>
          <Paragraph>
            AI機能（章分け・感想）には、あなた自身の{' '}
            <ThemedText type="defaultSemiBold">Anthropic APIキー</ThemedText> を使います。
            キーは設定画面から登録でき、端末のセキュア領域（Keychain）に保存されます。
          </Paragraph>
          <Paragraph>
            APIキーは Anthropic Console で発行できます。
            会話分類1回あたりの料金は数十円〜数百円程度です（会話の長さによります）。
          </Paragraph>
          <Pressable
            onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')}
            style={[styles.linkButton, { borderColor: theme.tint, backgroundColor: theme.surface }]}>
            <ThemedText style={[styles.linkButtonText, { color: theme.tint }]}>
              🔗 Anthropic Console（APIキー発行）
            </ThemedText>
          </Pressable>
        </Section>

        <Section title="🗑️ データの削除">
          <Paragraph>
            設定画面の「すべての会話を削除」で、本棚に並ぶ会話を一括で消せます。
            元には戻せません。
          </Paragraph>
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <ThemedText style={styles.paragraph}>{children}</ThemedText>;
}

function Box({ theme, children }: { theme: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  lead: { fontSize: 15, lineHeight: 24, marginBottom: 8 },
  section: { marginTop: 28 },
  sectionTitle: { marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 24, marginBottom: 10 },
  box: {
    marginTop: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  boxText: { fontSize: 13, lineHeight: 20 },
  linkButton: {
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  linkButtonText: { fontSize: 14, fontWeight: '600' },
});
