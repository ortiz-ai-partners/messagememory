import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import JSZip from 'jszip';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import { importConversation } from '@/src/db/queries';
import { parseMessengerJson } from '@/src/parsers/messengerJsonParser';
import {
  importConversationFromZip,
  openZipFromUri,
  scanConversations,
  type ConversationInZip,
} from '@/src/parsers/zipImport';
import { getGender } from '@/src/secrets/preferences';
import { SAMPLES, type SampleKey } from '@/src/test/sampleJson';

type Stage = 'idle' | 'working' | 'picking';

export default function ImportScreen() {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>('idle');
  const [status, setStatus] = useState<string>(
    'Messenger のエクスポート（.zip または message_*.json）を選んでください',
  );
  const [sampleOrder, setSampleOrder] = useState<SampleKey[]>(['ortis', 'rilmu']);
  const [zip, setZip] = useState<JSZip | null>(null);
  const [zipConversations, setZipConversations] = useState<ConversationInZip[]>([]);

  useEffect(() => {
    (async () => {
      const g = await getGender();
      if (g === 'male') setSampleOrder(['rilmu', 'ortis']);
      else setSampleOrder(['ortis', 'rilmu']);
    })();
  }, []);

  async function handlePick() {
    try {
      setStage('working');
      setStatus('ファイルを選択中...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        setStage('idle');
        setStatus('キャンセルされました');
        return;
      }

      const asset = result.assets[0];
      const isZip =
        asset.mimeType === 'application/zip' ||
        asset.name?.toLowerCase().endsWith('.zip');

      if (isZip) {
        setStatus('ZIPを読み込み中...');
        const loadedZip = await openZipFromUri(asset.uri);
        setStatus('会話を検出中...');
        const convs = await scanConversations(loadedZip);
        if (convs.length === 0) {
          setStage('idle');
          Alert.alert(
            '会話が見つかりませんでした',
            'Messengerのエクスポート（JSON形式）であることを確認してください。',
          );
          return;
        }
        setZip(loadedZip);
        setZipConversations(convs);
        setStage('picking');
        setStatus(`${convs.length} 件の会話が見つかりました。取り込む相手を選んでください`);
      } else {
        setStatus(`読み込み中: ${asset.name}`);
        const content = await FileSystem.readAsStringAsync(asset.uri);
        await importFromJsonString(content);
      }
    } catch (e) {
      setStage('idle');
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`エラー: ${msg}`);
    }
  }

  async function handleSample(key: SampleKey) {
    if (stage === 'working') return;
    setStage('working');
    try {
      await importFromJsonString(SAMPLES[key].json);
    } catch (e) {
      setStage('idle');
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`エラー: ${msg}`);
    }
  }

  async function handlePickConversation(conv: ConversationInZip) {
    if (!zip) return;
    try {
      setStage('working');
      const parsed = await importConversationFromZip(zip, conv.folderPath, (s) => setStatus(s));
      setStatus(`${parsed.messages.length} 件を保存中...`);
      const db = await openDb();
      const { conversationId, messageCount } = await importConversation(db, parsed);
      finishImport(parsed.title, conversationId, messageCount);
    } catch (e) {
      setStage('idle');
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`エラー: ${msg}`);
    }
  }

  async function importFromJsonString(content: string) {
    setStatus('パース中...');
    const parsed = parseMessengerJson(content);
    setStatus(`${parsed.messages.length} 件を保存中...`);
    const db = await openDb();
    const { conversationId, messageCount } = await importConversation(db, parsed);
    finishImport(parsed.title, conversationId, messageCount);
  }

  function finishImport(title: string, conversationId: number, count: number) {
    setStatus(`✓ ${title} を取込完了（${count} 件）`);
    setStage('idle');
    Alert.alert('取込完了', `${title}\n${count} 件のメッセージ`, [
      {
        text: '会話を開く',
        onPress: () =>
          router.replace({
            pathname: '/conversation/[id]',
            params: { id: String(conversationId) },
          }),
      },
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  function handleCancelPick() {
    setZip(null);
    setZipConversations([]);
    setStage('idle');
    setStatus('Messenger のエクスポート（.zip または message_*.json）を選んでください');
  }

  const busy = stage === 'working';

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <ThemedText type="title">インポート</ThemedText>

      {stage === 'picking' ? (
        <ConversationPickerView
          conversations={zipConversations}
          onPick={handlePickConversation}
          onCancel={handleCancelPick}
          theme={theme}
          status={status}
        />
      ) : (
        <>
          <ThemedText style={[styles.description, { color: theme.textMuted }]}>
            Facebook の「Download Your Information」で出力した{'\n'}
            <ThemedText type="defaultSemiBold">.zip ファイル</ThemedText>
            か、展開済みの <ThemedText type="defaultSemiBold">message_*.json</ThemedText> を選んでください。
          </ThemedText>
          <ThemedText style={[styles.notice, { color: theme.textMuted, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            📚 取り込むと本棚に「新しい1冊」として追加されます。既存の会話には統合されません。
          </ThemedText>

          <View style={styles.buttonArea}>
            <Pressable
              style={[
                styles.pickButton,
                { backgroundColor: theme.tint },
                busy && styles.pickButtonBusy,
              ]}
              onPress={handlePick}
              disabled={busy}>
              <ThemedText type="defaultSemiBold" style={styles.pickButtonText}>
                ファイルを選ぶ
              </ThemedText>
            </Pressable>

            <ThemedText style={[styles.sampleLabel, { color: theme.textMuted }]}>
              または、サンプルで試す
            </ThemedText>
            {sampleOrder.map((key) => (
              <Pressable
                key={key}
                style={[
                  styles.sampleButton,
                  { borderColor: theme.tint },
                  busy && styles.pickButtonBusy,
                ]}
                onPress={() => handleSample(key)}
                disabled={busy}>
                <ThemedText type="defaultSemiBold" style={[styles.sampleButtonText, { color: theme.tint }]}>
                  🧪 {SAMPLES[key].label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={[styles.status, { color: theme.textMuted }]}>{status}</ThemedText>
        </>
      )}
    </ThemedView>
  );
}

type Theme = ReturnType<typeof useTheme>;

function ConversationPickerView({
  conversations,
  onPick,
  onCancel,
  theme,
  status,
}: {
  conversations: ConversationInZip[];
  onPick: (c: ConversationInZip) => void;
  onCancel: () => void;
  theme: Theme;
  status: string;
}) {
  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerHeader}>
        <ThemedText type="subtitle">取り込む相手を選ぶ</ThemedText>
        <Pressable onPress={onCancel} hitSlop={8}>
          <ThemedText style={{ color: theme.tint }}>キャンセル</ThemedText>
        </Pressable>
      </View>
      <ThemedText style={[styles.pickerHint, { color: theme.textMuted }]}>{status}</ThemedText>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.folderPath}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.convRow,
              { backgroundColor: theme.surface, borderColor: theme.borderSoft },
            ]}
            onPress={() => onPick(item)}>
            <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
            <ThemedText style={[styles.convSub, { color: theme.textMuted }]}>
              {item.messageFileCount > 1
                ? `${item.messageFileCount} 分割ファイル`
                : 'JSONファイル 1個'}
              {item.lastMessageAt
                ? ` ・ 最終 ${new Date(item.lastMessageAt).toLocaleDateString('ja-JP')}`
                : ''}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 24 },
  description: { marginTop: 12, lineHeight: 20 },
  notice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    lineHeight: 18,
  },

  buttonArea: { marginTop: 28, alignItems: 'stretch' },
  pickButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  pickButtonBusy: { opacity: 0.5 },
  pickButtonText: { color: '#fff', fontSize: 16 },
  sampleLabel: { marginTop: 24, fontSize: 13, textAlign: 'center' },
  sampleButton: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  sampleButtonText: { fontSize: 14 },

  status: { marginTop: 24, textAlign: 'center' },

  pickerContainer: { flex: 1, marginTop: 16 },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerHint: { fontSize: 13, marginBottom: 12 },
  convRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  convSub: { fontSize: 12, marginTop: 4 },
});
