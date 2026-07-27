import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ColorPickerModal } from '@/components/color-picker-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import {
  deleteConversation,
  listConversations,
  setConversationColor,
  setConversationPinned,
  setConversationTitle,
  type ConversationRow,
} from '@/src/db/queries';
import { isOnboarded } from '@/src/secrets/preferences';

export default function ConversationsScreen() {
  const theme = useTheme();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorPickerFor, setColorPickerFor] = useState<ConversationRow | null>(null);

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

  function handleOpenMenu(item: ConversationRow) {
    Alert.alert(item.title, '', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '✎ 名前を変更', onPress: () => handleRename(item) },
      { text: '🎨 背表紙の色', onPress: () => setColorPickerFor(item) },
      { text: item.is_pinned ? '📌 ピンを外す' : '📌 ピン留め', onPress: () => handleTogglePin(item) },
      { text: '削除', style: 'destructive', onPress: () => handleDelete(item) },
    ]);
  }

  async function handlePickColor(color: string | null) {
    if (!colorPickerFor) return;
    const id = colorPickerFor.id;
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, color } : c)));
    const db = await openDb();
    await setConversationColor(db, id, color);
  }

  function handleRename(item: ConversationRow) {
    // iOS の Alert.prompt は単体メソッドとして提供される
    Alert.prompt(
      'タイトルを変更',
      'この本に付ける名前を入力してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存',
          onPress: async (next?: string) => {
            const trimmed = (next ?? '').trim();
            if (!trimmed || trimmed === item.title) return;
            setConversations(prev =>
              prev.map(c => (c.id === item.id ? { ...c, title: trimmed } : c)),
            );
            const db = await openDb();
            await setConversationTitle(db, item.id, trimmed);
          },
        },
      ],
      'plain-text',
      item.title,
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <WoodTexture />
        <View style={styles.header}>
          <ThemedText type="title">本棚</ThemedText>
          <Link href="/import" asChild>
            <Pressable style={[styles.importButton, { backgroundColor: theme.tint }]}>
              <ThemedText type="defaultSemiBold" style={styles.importButtonText}>
                ＋ インポート
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        {conversations.length > 0 ? (
          <Link href="/stats/all" asChild>
            <Pressable
              style={[
                styles.overallStatsCard,
                { backgroundColor: theme.surface, borderColor: theme.tint },
              ]}>
              <ThemedText style={[styles.overallStatsText, { color: theme.tint }]}>
                📊 本棚全体の会話グラフを見る
              </ThemedText>
              <ThemedText style={[styles.chevron, { color: theme.tint }]}>›</ThemedText>
            </Pressable>
          </Link>
        ) : null}

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
                onRename={handleRename}
                onOpenMenu={handleOpenMenu}
                defaultColor={theme.accent}
                pinColor={theme.pin}
                dangerColor={theme.danger}
                borderColor={theme.borderSoft}
                renameColor={theme.tint}
              />
            )}
          />
        )}
      </ThemedView>

      <ColorPickerModal
        visible={!!colorPickerFor}
        current={colorPickerFor?.color ?? null}
        onClose={() => setColorPickerFor(null)}
        onPick={handlePickColor}
      />
    </GestureHandlerRootView>
  );
}

function SwipeableRow({
  item,
  onPin,
  onDelete,
  onRename,
  onOpenMenu,
  defaultColor,
  pinColor,
  dangerColor,
  borderColor,
  renameColor,
}: {
  item: ConversationRow;
  onPin: (c: ConversationRow) => void;
  onDelete: (c: ConversationRow) => void;
  onRename: (c: ConversationRow) => void;
  onOpenMenu: (c: ConversationRow) => void;
  defaultColor: string;
  pinColor: string;
  dangerColor: string;
  borderColor: string;
  renameColor: string;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);

  const spineColor = item.color ?? defaultColor;

  // Web では ReanimatedSwipeable がスタイル設定で死ぬのと、スワイプ操作自体が
  // デスクトップだと自然じゃないので、シンプルな行＋右端メニューにする。
  if (Platform.OS === 'web') {
    return (
      <View style={styles.rowWrap}>
        <Link href={{ pathname: '/conversation/[id]', params: { id: String(item.id) } }} asChild>
          <Pressable style={styles.rowMain} onLongPress={() => onOpenMenu(item)}>
            <RowContents item={item} />
          </Pressable>
        </Link>
        <Pressable
          style={[styles.spineTab, { backgroundColor: spineColor }]}
          onPress={() => onOpenMenu(item)}
          hitSlop={6}>
          <ThemedText style={styles.spineDots}>⋮</ThemedText>
        </Pressable>
      </View>
    );
  }

  const renderRightActions = () => (
    <View style={styles.actionsRow}>
      <Pressable
        style={[styles.action, { backgroundColor: renameColor }]}
        onPress={() => {
          swipeRef.current?.close();
          onRename(item);
        }}>
        <ThemedText style={styles.actionText}>名前</ThemedText>
      </Pressable>
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
      <View style={styles.rowWrap}>
        <Link href={{ pathname: '/conversation/[id]', params: { id: String(item.id) } }} asChild>
          <Pressable style={styles.rowMain}>
            <RowContents item={item} />
          </Pressable>
        </Link>
        <Pressable
          style={[styles.spineTab, { backgroundColor: spineColor }]}
          onPress={() => onOpenMenu(item)}
          hitSlop={8}>
          <ThemedText style={styles.spineDots}>⋮</ThemedText>
        </Pressable>
      </View>
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
  overallStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  overallStatsText: { fontSize: 14, fontWeight: '600' },
  chevron: { fontSize: 20 },
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
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderRadius: 12,
    marginVertical: 5,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  spineTab: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineDots: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  pinMark: { fontSize: 14 },
  sub: { fontSize: 13, opacity: 0.6, marginTop: 4 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  action: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '600' },
});
