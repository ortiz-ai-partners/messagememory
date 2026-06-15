import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { CategoryColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import {
  getChapter,
  getMessagesInRangeWithMedia,
  setChapterFavorite,
  setChapterHeart,
  type ChapterRow,
  type MessageWithMedia,
} from '@/src/db/queries';

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChapterDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chapterId = Number(id);

  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [messages, setMessages] = useState<MessageWithMedia[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(chapterId)) return;
    const db = await openDb();
    const ch = await getChapter(db, chapterId);
    if (!ch) {
      setLoading(false);
      return;
    }
    setChapter(ch);
    const msgs = await getMessagesInRangeWithMedia(db, ch.conversation_id, ch.start_message_id, ch.end_message_id);
    setMessages(msgs);
    setLoading(false);
  }, [chapterId]);

  useEffect(() => {
    load();
  }, [load]);

  const myName = messages[0]?.sender_name ?? '';
  const startDate = messages[0] ? formatDate(messages[0].timestamp_ms) : '';
  const endDate = messages[messages.length - 1] ? formatDate(messages[messages.length - 1].timestamp_ms) : '';

  async function toggleFav() {
    if (!chapter) return;
    const next = chapter.is_favorite === 1 ? 0 : 1;
    setChapter({ ...chapter, is_favorite: next });
    const db = await openDb();
    await setChapterFavorite(db, chapter.id, next === 1);
  }

  async function toggleHeart() {
    if (!chapter) return;
    const next = chapter.is_heart === 1 ? 0 : 1;
    setChapter({ ...chapter, is_heart: next });
    const db = await openDb();
    await setChapterHeart(db, chapter.id, next === 1);
  }

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <Stack.Screen
        options={{
          title: chapter?.title ?? 'トピック',
          headerRight: () =>
            chapter ? (
              <View style={{ flexDirection: 'row', gap: 12, marginRight: 12 }}>
                <Pressable onPress={toggleFav} hitSlop={8}>
                  <ThemedText style={styles.headerFav}>{chapter.is_favorite ? '⭐' : '☆'}</ThemedText>
                </Pressable>
                <Pressable onPress={toggleHeart} hitSlop={8}>
                  <ThemedText style={styles.headerFav}>{chapter.is_heart ? '💗' : '♡'}</ThemedText>
                </Pressable>
              </View>
            ) : null,
        }}
      />

      {loading ? (
        <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
      ) : !chapter ? (
        <ThemedText style={styles.placeholder}>トピックが見つかりません</ThemedText>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={m => String(m.id)}
          ListHeaderComponent={
            <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
              <View style={styles.headerTop}>
                <ThemedText type="title" style={styles.headerTitle}>{chapter.title}</ThemedText>
                {chapter.category ? (
                  <View style={[styles.badge, { backgroundColor: CategoryColors[chapter.category] ?? '#b5ac95' }]}>
                    <ThemedText style={styles.badgeText}>{chapter.category}</ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText style={[styles.period, { color: theme.textMuted }]}>
                {startDate}{startDate !== endDate ? ` 〜 ${endDate}` : ''} ・ {messages.length} 件
              </ThemedText>
              {chapter.summary ? (
                <ThemedText style={styles.summary}>{chapter.summary}</ThemedText>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Bubble theme={theme} message={item} isOwn={item.sender_name !== myName} />
          )}
        />
      )}
    </ThemedView>
  );
}

type Theme = ReturnType<typeof useTheme>;

function Bubble({ theme, message, isOwn }: { theme: Theme; message: MessageWithMedia; isOwn: boolean }) {
  const stickers = message.media.filter(m => m.kind === 'sticker');
  const photos = message.media.filter(m => m.kind === 'photo' || m.kind === 'gif');
  const stickerOnly = stickers.length > 0 && !message.body && photos.length === 0;
  const photoOnly = photos.length > 0 && !message.body && stickers.length === 0;

  if (stickerOnly) {
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View>
          {!isOwn && (
            <ThemedText style={[styles.senderOutside, { color: theme.senderLabel }]}>
              {message.sender_name}
            </ThemedText>
          )}
          {stickers.map((s, i) => (
            <Image
              key={i}
              source={{ uri: localUri(s.local_path) }}
              style={styles.sticker}
              contentFit="contain"
            />
          ))}
          <ThemedText style={[styles.time, { color: theme.textMuted, textAlign: isOwn ? 'right' : 'left' }]}>
            {formatTime(message.timestamp_ms)}
          </ThemedText>
        </View>
      </View>
    );
  }

  if (photoOnly) {
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View>
          {!isOwn && (
            <ThemedText style={[styles.senderOutside, { color: theme.senderLabel }]}>
              {message.sender_name}
            </ThemedText>
          )}
          <View style={styles.photoGrid}>
            {photos.map((p, i) => (
              <Image
                key={i}
                source={{ uri: localUri(p.local_path) }}
                style={styles.photo}
                contentFit="cover"
              />
            ))}
          </View>
          <ThemedText style={[styles.time, { color: theme.textMuted, textAlign: isOwn ? 'right' : 'left' }]}>
            {formatTime(message.timestamp_ms)}
          </ThemedText>
        </View>
      </View>
    );
  }

  const hasMediaAttached = stickers.length + photos.length > 0;
  const fallback =
    !message.body && !hasMediaAttached
      ? message.type === 'photo' ? '[写真]'
      : message.type === 'sticker' ? '[スタンプ]'
      : message.type === 'gif' ? '[GIF]'
      : message.type === 'video' ? '[動画]'
      : message.type === 'share' ? '[シェア]'
      : ''
      : '';
  const body = message.body ?? fallback;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: isOwn ? theme.bubbleOwn : theme.bubbleOther },
          isOwn ? styles.bubbleOwnCorner : styles.bubbleOtherCorner,
        ]}>
        {!isOwn && (
          <ThemedText style={[styles.sender, { color: theme.senderLabel }]}>
            {message.sender_name}
          </ThemedText>
        )}
        {photos.length > 0 && (
          <View style={[styles.photoGrid, { marginBottom: body ? 6 : 0 }]}>
            {photos.map((p, i) => (
              <Image
                key={i}
                source={{ uri: localUri(p.local_path) }}
                style={styles.photo}
                contentFit="cover"
              />
            ))}
          </View>
        )}
        {body ? (
          <ThemedText style={{ color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }}>
            {body}
          </ThemedText>
        ) : null}
        <ThemedText style={[styles.time, { color: isOwn ? '#fffb' : theme.textMuted }]}>
          {formatTime(message.timestamp_ms)}
        </ThemedText>
      </View>
    </View>
  );
}

function localUri(localPath: string): string {
  if (localPath.startsWith('file://')) return localPath;
  if (localPath.startsWith('/')) return 'file://' + localPath;
  return localPath;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { opacity: 0.6, textAlign: 'center', marginTop: 40 },
  header: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { flex: 1 },
  headerFav: { fontSize: 22 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, color: '#fff' },
  period: { fontSize: 13, marginTop: 6 },
  summary: { marginTop: 12, lineHeight: 22, opacity: 0.85 },
  row: { paddingHorizontal: 12, paddingVertical: 3 },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleOwnCorner: { borderBottomRightRadius: 4 },
  bubbleOtherCorner: { borderBottomLeftRadius: 4 },
  sender: { fontSize: 11, marginBottom: 2 },
  senderOutside: { fontSize: 11, marginBottom: 4, paddingHorizontal: 4 },
  time: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  sticker: { width: 110, height: 110, marginTop: 2 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photo: { width: 210, height: 210, borderRadius: 10 },
});
