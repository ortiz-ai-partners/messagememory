import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { clearApiKey, loadApiKey, saveApiKey } from '@/src/secrets/apiKeyStore';

function mask(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '****';
  return key.slice(0, 8) + '...' + key.slice(-4);
}

export default function SettingsScreen() {
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await loadApiKey();
      setSaved(existing);
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

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <ThemedText type="title">設定</ThemedText>

      <View style={styles.section}>
        <ThemedText type="subtitle">Anthropic APIキー</ThemedText>
        <ThemedText style={styles.hint}>
          トピック分類に使用します。キーは端末のセキュア領域にのみ保存され、外部に送信されません。
        </ThemedText>

        {saved ? (
          <View style={styles.savedRow}>
            <ThemedText style={styles.mono}>{mask(saved)}</ThemedText>
            <Pressable onPress={handleClear}>
              <ThemedText style={styles.clearText}>削除</ThemedText>
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
          style={[styles.saveButton, (busy || !input) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={busy || !input}>
          <ThemedText type="defaultSemiBold" style={styles.saveButtonText}>
            保存
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 56 },
  section: { marginTop: 24 },
  hint: { fontSize: 13, opacity: 0.7, marginTop: 6, lineHeight: 18 },
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
  clearText: { color: '#d33' },
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
    backgroundColor: '#8b6f47',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: '#fff' },
});
