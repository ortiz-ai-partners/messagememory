import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import { deleteAllConversations, listConversations } from '@/src/db/queries';
import { clearApiKey, loadApiKey, saveApiKey } from '@/src/secrets/apiKeyStore';
import { resetOnboarding } from '@/src/secrets/preferences';

function mask(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '****';
  return key.slice(0, 8) + '...' + key.slice(-4);
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conversationCount, setConversationCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const existing = await loadApiKey();
      setSaved(existing);
      const db = await openDb();
      const rows = await listConversations(db);
      setConversationCount(rows.length);
    })();
  }, []);

  async function handleSave() {
    const trimmed = input.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('形式エラー', 'Anthropic APIキーは sk-ant- で始まります。');
      return;
    }
    setBusy(true);
    try {
      await saveApiKey(trimmed);
      setSaved(trimmed);
      setInput('');
      Alert.alert('保存しました', 'APIキーを端末内に安全に保存しました。');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    Alert.alert('削除しますか', 'この端末からAPIキーを削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey();
          setSaved(null);
        },
      },
    ]);
  }

  async function handleDeleteAllData() {
    Alert.alert(
      'すべての会話を削除しますか？',
      `${conversationCount} 件の会話・章・お気に入り・写真がすべて消えます。\n元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'すべて削除',
          style: 'destructive',
          onPress: async () => {
            const db = await openDb();
            await deleteAllConversations(db);
            setConversationCount(0);
            Alert.alert('削除しました', 'すべての会話データを削除しました。');
          },
        },
      ],
    );
  }

  async function handleResetOnboarding() {
    Alert.alert('オンボーディングをやり直しますか？', '性別選択画面が再表示されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'やり直す',
        onPress: async () => {
          await resetOnboarding();
          router.replace('/onboarding');
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="title">設定</ThemedText>

        {/* データ管理 */}
        <View style={styles.section}>
          <ThemedText type="subtitle">データ</ThemedText>
          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            現在 {conversationCount} 件の会話が記録されています。
          </ThemedText>

          <Link href="/import" asChild>
            <Pressable style={[styles.actionRow, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
              <ThemedText type="defaultSemiBold">＋ 新しい会話を取り込む</ThemedText>
              <ThemedText style={[styles.chevron, { color: theme.textMuted }]}>›</ThemedText>
            </Pressable>
          </Link>
          <ThemedText style={[styles.subHint, { color: theme.textMuted }]}>
            取り込むと、本棚に「新しい1冊」として追加されます。既存の会話には上書きされません。
          </ThemedText>

          <Pressable
            style={[styles.actionRow, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
            onPress={handleDeleteAllData}>
            <ThemedText type="defaultSemiBold" style={{ color: theme.danger }}>
              すべての会話を削除
            </ThemedText>
            <ThemedText style={[styles.chevron, { color: theme.textMuted }]}>›</ThemedText>
          </Pressable>
        </View>

        {/* Anthropic APIキー */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Anthropic APIキー</ThemedText>
          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            トピック分類・会話の感想に使用します。キーは端末のセキュア領域にのみ保存され、外部に送信されません。
          </ThemedText>

          {saved ? (
            <View style={styles.savedRow}>
              <ThemedText style={styles.mono}>{mask(saved)}</ThemedText>
              <Pressable onPress={handleClear}>
                <ThemedText style={{ color: theme.danger }}>削除</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ThemedText style={styles.notSet}>未設定</ThemedText>
          )}

          <TextInput
            style={styles.input}
            placeholder="sk-ant-api03-..."
            placeholderTextColor="#888"
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.tint }, (busy || !input) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={busy || !input}>
            <ThemedText type="defaultSemiBold" style={styles.saveButtonText}>
              保存
            </ThemedText>
          </Pressable>
        </View>

        {/* その他 */}
        <View style={styles.section}>
          <ThemedText type="subtitle">その他</ThemedText>

          <Link href="/help" asChild>
            <Pressable style={[styles.actionRow, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
              <ThemedText type="defaultSemiBold">📖 使い方を見る</ThemedText>
              <ThemedText style={[styles.chevron, { color: theme.textMuted }]}>›</ThemedText>
            </Pressable>
          </Link>

          <Pressable
            style={[styles.actionRow, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
            onPress={handleResetOnboarding}>
            <ThemedText type="defaultSemiBold">オンボーディングをやり直す</ThemedText>
            <ThemedText style={[styles.chevron, { color: theme.textMuted }]}>›</ThemedText>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 56 },
  section: { marginTop: 28 },
  hint: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  subHint: { fontSize: 11, marginTop: 8, paddingHorizontal: 4, lineHeight: 16 },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chevron: { fontSize: 20 },

  savedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5ecd9',
    borderRadius: 10,
  },
  mono: { fontFamily: 'Courier', fontSize: 13 },
  notSet: { marginTop: 14, opacity: 0.6 },

  input: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#d6c5a4',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#3e2f1e',
    backgroundColor: '#faf3e3',
  },
  saveButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: '#fff' },
});
