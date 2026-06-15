import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import {
  deleteConversation,
  listConversations,
  setConversationPinned,
  type ConversationRow,
} from '@/src/db/queries';
import { isOnboarded } from '@/src/secrets/preferences';

export default function ConversationsScreen() {
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!(await isOnboarded())) {
      router.replace('/onboarding');
      return;
    }
    const db = await openDb();
    const rows = await listConversations(db);
    setConversations(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function handleTogglePin(item: ConversationRow) {
    const next = item.is_pinned === 1 ? 0 : 1;
    setConversations(prev =>
      [...prev.map(c => (c.id === item.id ? { ...c, is_pinned: next } : c))]
        .sort((a, b) => (b.is_pinned - a.is_pinned) || (b.imported_at - a.imported_at)),
    );
    const db = await openDb();
    await setConversationPinned(db, item.id, next === 1);
  }

  async function handleDelete(item: ConversationRow) {
    Alert.alert('削除しますか', `「${item.title}」を完全に削除します。元に戻せません。`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          const db = await openDb();
          await deleteConversation(db, item.id);
          setConversations(prev => prev.filter(c => c.id !== item.id));
        },
      },
    ]);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <WoodTexture />
        <View style={styles.header}>
          <ThemedText type="title">会話</ThemedText>
          <Link href="/import" asChild>
            <Pressable style={[styles.importButton, { backgroundColor: theme.tint }]}>
              <ThemedText type="defaultSemiBold" style={styles.importButtonText}>
                ＋ インポート
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        {loading ? (
          <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
        ) : conversations.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={styles.placeholder}>
              まだ会話がありません。右上の「インポート」から Messenger の JSON を追加してください。
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <SwipeableRow
                item={item}
                onPin={handleTogglePin}
                onDelete={handleDelete}
                pinColor={theme.pin}
                dangerColor={theme.danger}
                borderColor={theme.borderSoft}
              />
            )}
          />
        )}
      </ThemedView>
    </GestureHandlerRootView>
  );
}

function SwipeableRow({
  item,
  onPin,
  onDelete,
  pinColor,
  dangerColor,
  borderColor,
}: {
  item: ConversationRow;
  onPin: (c: ConversationRow) => void;
  onDelete: (c: ConversationRow) => void;
  pinColor: string;
  dangerColor: string;
  borderColor: string;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);

  // Web では ReanimatedSwipeable がスタイル設定で死ぬのと、スワイプ操作自体が
  // デスクトップだと自然じゃないので、シンプルな行＋長押しメニューに簡略化する。
  if (Platform.OS === 'web') {
    return (
      <Link href={{ pathname: '/conversation/[id]', params: { id: String(item.id) } }} asChild>
        <Pressable
          style={[styles.row, { borderBottomColor: borderColor }]}
          onLongPress={() => {
            Alert.alert(item.title, '', [
              { text: 'キャンセル', style: 'cancel' },
              { text: item.is_pinned ? 'ピンを外す' : '📌 ピン留め', onPress: () => onPin(item) },
              { text: '削除', style: 'destructive', onPress: () => onDelete(item) },
            ]);
          }}>
          <RowContents item={item} />
        </Pressable>
      </Link>
    );
  }

  const renderRightActions = () => (
    <View style={styles.actionsRow}>
      <Pressable
        style={[styles.action, { backgroundColor: pinColor }]}
        onPress={() => {
          swipeRef.current?.close();
          onPin(item);
        }}>
        <ThemedText style={styles.actionText}>
          {item.is_pinned ? '外す' : '📌'}
        </ThemedText>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: dangerColor }]}
        onPress={() => {
          swipeRef.current?.close();
          onDelete(item);
        }}>
        <ThemedText style={styles.actionText}>削除</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}>
      <Link href={{ pathname: '/conversation/[id]', params: { id: String(item.id) } }} asChild>
        <Pressable style={[styles.row, { borderBottomColor: borderColor }]}>
          <RowContents item={item} />
        </Pressable>
      </Link>
    </ReanimatedSwipeable>
  );
}

function RowContents({ item }: { item: ConversationRow }) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {item.is_pinned ? <ThemedText style={styles.pinMark}>📌</ThemedText> : null}
        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
      </View>
      <ThemedText style={styles.sub}>
        参加者 {item.participant_count} 人 ・ {new Date(item.imported_at).toLocaleDateString('ja-JP')} 取込
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  importButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  importButtonText: { color: '#fff', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  placeholder: { opacity: 0.6, textAlign: 'center' },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinMark: { fontSize: 14 },
  sub: { fontSize: 13, opacity: 0.6, marginTop: 4 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  action: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600' },
});
