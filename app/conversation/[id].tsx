import { Image } from 'expo-image';
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SectionList, StyleSheet, View, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { CategoryColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SEGMENTER_MODEL, segmentConversation } from '@/src/ai/segmenter';
import { CATEGORIES } from '@/src/ai/prompts';
import { openDb } from '@/src/db';
import {
  getConversation,
  getMessagesWithMedia,
  listChapters,
  replaceChapters,
  setChapterFavorite,
  setChapterHeart,
  type ChapterRow,
  type ConversationRow,
  type MessageWithMedia,
} from '@/src/db/queries';
import { loadApiKey } from '@/src/secrets/apiKeyStore';

type Section = { title: string; data: MessageWithMedia[] };

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function groupByDate(messages: MessageWithMedia[]): Section[] {
  const sections: Section[] = [];
  let currentDate = '';
  for (const m of messages) {
    const date = formatDate(m.timestamp_ms);
    if (date !== currentDate) {
      sections.push({ title: date, data: [] });
      currentDate = date;
    }
    sections[sections.length - 1].data.push(m);
  }
  return sections;
}

type FilterMode = 'all' | 'important' | 'heart';
type ViewMode = 'chapters' | 'dates';

export default function ConversationDetailScreen() {
  const theme = useTheme();
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const conversationId = Number(id);

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageWithMedia[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState<{ current: number; total: number } | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category ?? null);
  const [viewMode, setViewMode] = useState<ViewMode>('chapters');

  // 円グラフから「category=デート」のような形で飛んでくると初期選択する
  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  const [messagesLoading, setMessagesLoading] = useState(false);

  // 軽い情報（会話メタ＋章のみ）。大量メッセージは読み込まない。
  const loadBasic = useCallback(async () => {
    if (!Number.isFinite(conversationId)) return;
    const db = await openDb();
    const [conv, chs] = await Promise.all([
      getConversation(db, conversationId),
      listChapters(db, conversationId),
    ]);
    setConversation(conv);
    setChapters(chs);
    setLoading(false);
  }, [conversationId]);

  // 重い処理：メッセージ＋メディア。日付別表示や AI 分類で必要になった時だけ呼ぶ。
  const ensureMessages = useCallback(async (): Promise<MessageWithMedia[]> => {
    if (messages.length > 0) return messages;
    setMessagesLoading(true);
    try {
      const db = await openDb();
      const msgs = await getMessagesWithMedia(db, conversationId);
      setMessages(msgs);
      return msgs;
    } finally {
      setMessagesLoading(false);
    }
  }, [conversationId, messages]);

  // 章詳細から戻ってきた時にも反映されるよう、フォーカスのたびに「軽い」方だけ読み直す
  useFocusEffect(useCallback(() => {
    loadBasic();
  }, [loadBasic]));

  async function handleToggleImportant(chapter: ChapterRow) {
    const next = chapter.is_favorite === 1 ? 0 : 1;
    setChapters(prev => prev.map(c => (c.id === chapter.id ? { ...c, is_favorite: next } : c)));
    const db = await openDb();
    await setChapterFavorite(db, chapter.id, next === 1);
  }

  async function handleToggleHeart(chapter: ChapterRow) {
    const next = chapter.is_heart === 1 ? 0 : 1;
    setChapters(prev => prev.map(c => (c.id === chapter.id ? { ...c, is_heart: next } : c)));
    const db = await openDb();
    await setChapterHeart(db, chapter.id, next === 1);
  }

  async function handleSegment() {
    if (segmenting) return;
    const apiKey = await loadApiKey();
    if (!apiKey) {
      Alert.alert('APIキー未設定', '設定画面で Anthropic API キーを登録してください。');
      return;
    }
    setSegmenting(true);
    setSegmentProgress(null);
    try {
      const msgs = await ensureMessages();
      if (msgs.length === 0) {
        Alert.alert('メッセージが空です');
        return;
      }
      const result = await segmentConversation(apiKey, msgs, p => setSegmentProgress(p));
      if (result.length === 0) {
        Alert.alert('章を生成できませんでした', 'メッセージが少なすぎる可能性があります。');
        return;
      }
      const db = await openDb();
      await replaceChapters(db, conversationId, result, SEGMENTER_MODEL);
      await loadBasic();
      Alert.alert('完了', `${result.length} 章に分類しました`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('エラー', msg);
    } finally {
      setSegmenting(false);
      setSegmentProgress(null);
    }
  }

  const filteredChapters = useMemo(() => {
    let list = chapters;
    if (filterMode === 'important') list = list.filter(c => c.is_favorite === 1);
    if (filterMode === 'heart') list = list.filter(c => c.is_heart === 1);
    if (selectedCategory) list = list.filter(c => c.category === selectedCategory);
    return list;
  }, [chapters, filterMode, selectedCategory]);

  const hasChapters = chapters.length > 0;

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <Stack.Screen
        options={{
          title: conversation?.title ?? '会話',
          headerRight: () =>
            segmenting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
                <ActivityIndicator />
                {segmentProgress ? (
                  <ThemedText style={{ fontSize: 11, color: theme.textMuted }}>
                    {segmentProgress.current}/{segmentProgress.total}
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <Pressable onPress={handleSegment} hitSlop={8} style={{ marginRight: 12 }}>
                <ThemedText type="defaultSemiBold" style={{ color: theme.tint }}>
                  {hasChapters ? '再分類' : '記憶に分ける'}
                </ThemedText>
              </Pressable>
            ),
        }}
      />

      {loading ? (
        <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
      ) : hasChapters && viewMode === 'chapters' ? (
        <ChapterListView
          theme={theme}
          conversationId={conversationId}
          chapters={filteredChapters}
          allChapters={chapters}
          filterMode={filterMode}
          onChangeFilterMode={setFilterMode}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onToggleImportant={handleToggleImportant}
          onToggleHeart={handleToggleHeart}
          viewMode={viewMode}
          onChangeViewMode={(m: ViewMode) => {
            // 日付別に切替時にメッセージを遅延読み込み
            if (m === 'dates') ensureMessages();
            setViewMode(m);
          }}
        />
      ) : hasChapters ? (
        messagesLoading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator color={theme.tint} />
            <ThemedText style={[styles.placeholder, { marginTop: 12 }]}>
              メッセージを読み込み中...
            </ThemedText>
          </View>
        ) : (
          <TimelineView
            messages={messages}
            theme={theme}
            showViewToggle
            viewMode={viewMode}
            onChangeViewMode={(m: ViewMode) => {
              if (m === 'dates') ensureMessages();
              setViewMode(m);
            }}
          />
        )
      ) : (
        // 章未生成。メッセージ全件を持ち出すと重いので、AI分類CTAだけ出す。
        <View style={styles.loadingArea}>
          <View style={[styles.ctaBox, { backgroundColor: theme.surface }]}>
            <ThemedText style={styles.ctaText}>
              ヘッダー右上の「記憶に分ける」をタップすると、AIが話題ごとに記憶として整理します。
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

type Theme = ReturnType<typeof useTheme>;

// ============== 章一覧（分類後の通常ビュー）==============

function ChapterListView({
  theme,
  conversationId,
  chapters,
  allChapters,
  filterMode,
  onChangeFilterMode,
  selectedCategory,
  onSelectCategory,
  onToggleImportant,
  onToggleHeart,
  viewMode,
  onChangeViewMode,
}: {
  theme: Theme;
  conversationId: number;
  chapters: ChapterRow[];
  allChapters: ChapterRow[];
  filterMode: FilterMode;
  onChangeFilterMode: (m: FilterMode) => void;
  selectedCategory: string | null;
  onSelectCategory: (c: string | null) => void;
  onToggleImportant: (c: ChapterRow) => void;
  onToggleHeart: (c: ChapterRow) => void;
  viewMode: ViewMode;
  onChangeViewMode: (m: ViewMode) => void;
}) {
  // 会話に実際に存在するカテゴリだけ表示する
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const ch of allChapters) if (ch.category) set.add(ch.category);
    return CATEGORIES.filter(c => set.has(c));
  }, [allChapters]);

  const importantCount = allChapters.filter(c => c.is_favorite === 1).length;
  const heartCount = allChapters.filter(c => c.is_heart === 1).length;

  return (
    <ScrollView contentContainerStyle={styles.listPad}>
      <View style={styles.summaryRow}>
        <ThemedText type="subtitle">
          会話の記憶 {chapters.length}/{allChapters.length}
        </ThemedText>
        <Link
          href={{ pathname: '/stats/[id]', params: { id: String(conversationId) } }}
          asChild>
          <Pressable
            style={[styles.graphButton, { backgroundColor: theme.surface, borderColor: theme.tint }]}
            hitSlop={6}>
            <ThemedText style={[styles.graphButtonText, { color: theme.tint }]}>📊 会話グラフ</ThemedText>
          </Pressable>
        </Link>
      </View>

      <ViewModeToggle theme={theme} value={viewMode} onChange={onChangeViewMode} />

      <View style={styles.filterRow}>
        <FilterChip
          theme={theme}
          active={filterMode === 'all'}
          label="すべて"
          onPress={() => onChangeFilterMode('all')}
        />
        <FilterChip
          theme={theme}
          active={filterMode === 'important'}
          label={`⭐ 重要 (${importantCount})`}
          onPress={() => onChangeFilterMode(filterMode === 'important' ? 'all' : 'important')}
        />
        <FilterChip
          theme={theme}
          active={filterMode === 'heart'}
          label={`💗 栄養素 (${heartCount})`}
          onPress={() => onChangeFilterMode(filterMode === 'heart' ? 'all' : 'heart')}
        />
      </View>

      {availableCategories.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}>
          <FilterChip
            theme={theme}
            active={selectedCategory === null}
            label="全カテゴリ"
            onPress={() => onSelectCategory(null)}
          />
          {availableCategories.map(cat => (
            <FilterChip
              key={cat}
              theme={theme}
              active={selectedCategory === cat}
              label={cat}
              color={CategoryColors[cat]}
              onPress={() => onSelectCategory(selectedCategory === cat ? null : cat)}
            />
          ))}
        </ScrollView>
      ) : null}

      {chapters.length === 0 ? (
        <ThemedText style={styles.emptyFiltered}>
          該当するトピックがありません
        </ThemedText>
      ) : (
        chapters.map((ch, i) => (
          <View key={ch.id}>
            {i > 0 ? <View style={styles.chapterSeparator} /> : null}
            <Link
              href={{ pathname: '/chapter/[id]', params: { id: String(ch.id) } }}
              asChild>
              <Pressable
                style={[
                  styles.chapterCard,
                  {
                    borderColor: theme.borderSoft,
                    borderLeftColor: theme.accent,
                  },
                ]}>
              <View style={styles.chapterCardTop}>
                <ThemedText type="defaultSemiBold" style={styles.chapterTitle}>
                  {ch.title}
                </ThemedText>
                {ch.is_favorite ? <ThemedText style={styles.mark}>⭐</ThemedText> : null}
                {ch.is_heart ? <ThemedText style={styles.mark}>💗</ThemedText> : null}
                {ch.category ? (
                  <View style={[styles.badge, { backgroundColor: CategoryColors[ch.category] ?? '#b5ac95' }]}>
                    <ThemedText style={styles.badgeText}>{ch.category}</ThemedText>
                  </View>
                ) : null}
              </View>
              {ch.summary ? (
                <ThemedText style={[styles.chapterSummary, { color: theme.textMuted }]} numberOfLines={2}>
                  {ch.summary}
                </ThemedText>
              ) : null}
            </Pressable>
          </Link>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function FilterChip({
  theme,
  active,
  label,
  color,
  onPress,
}: {
  theme: Theme;
  active: boolean;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  const activeBg = color ?? theme.tint;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        { borderColor: theme.border },
        active && { backgroundColor: activeBg, borderColor: activeBg },
      ]}>
      <ThemedText
        style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ============== タイムライン（分類前の初期ビュー）==============

function TimelineView({
  messages,
  theme,
  showViewToggle,
  viewMode,
  onChangeViewMode,
}: {
  messages: MessageWithMedia[];
  theme: Theme;
  showViewToggle?: boolean;
  viewMode?: ViewMode;
  onChangeViewMode?: (m: ViewMode) => void;
}) {
  const sections = useMemo(() => groupByDate(messages), [messages]);
  const myName = messages[0]?.sender_name ?? '';
  // 章ありの場合は「日付別」モード → 初期状態は全部閉じる。章なしの場合は時系列で全部開く。
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (showViewToggle) return new Set();
    return new Set(sections.map(s => s.title));
  });

  function toggleDate(date: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      {showViewToggle && viewMode && onChangeViewMode ? (
        <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
          <ViewModeToggle theme={theme} value={viewMode} onChange={onChangeViewMode} />
        </View>
      ) : (
        <View style={[styles.ctaBox, { backgroundColor: theme.surface }]}>
          <ThemedText style={styles.ctaText}>
            ヘッダーの「記憶に分ける」ボタンを押すと、AIが話題ごとに記憶として整理します。
          </ThemedText>
        </View>
      )}

      {sections.map(section => {
        const isOpen = expanded.has(section.title);
        return (
          <View key={section.title}>
            <Pressable
              onPress={() => toggleDate(section.title)}
              style={[
                styles.dateRow,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.30)',
                  borderColor: theme.borderSoft,
                },
              ]}>
              <ThemedText type="defaultSemiBold" style={styles.dateRowText}>
                {section.title}
              </ThemedText>
              <View style={styles.dateRowMeta}>
                <ThemedText style={[styles.dateRowCount, { color: theme.textMuted }]}>
                  {section.data.length} 件
                </ThemedText>
                <ThemedText style={[styles.dateRowChevron, { color: theme.textMuted }]}>
                  {isOpen ? '▾' : '▸'}
                </ThemedText>
              </View>
            </Pressable>
            {isOpen
              ? section.data.map(m => (
                  <MessageBubble key={m.id} theme={theme} message={m} isOwn={m.sender_name !== myName} />
                ))
              : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function ViewModeToggle({
  theme,
  value,
  onChange,
}: {
  theme: Theme;
  value: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <View style={[styles.viewToggle, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      <Pressable
        style={[styles.viewToggleItem, value === 'chapters' && { backgroundColor: theme.tint }]}
        onPress={() => onChange('chapters')}>
        <ThemedText style={[styles.viewToggleText, value === 'chapters' && { color: '#fff' }]}>
          記憶別
        </ThemedText>
      </Pressable>
      <Pressable
        style={[styles.viewToggleItem, value === 'dates' && { backgroundColor: theme.tint }]}
        onPress={() => onChange('dates')}>
        <ThemedText style={[styles.viewToggleText, value === 'dates' && { color: '#fff' }]}>
          日付別
        </ThemedText>
      </Pressable>
    </View>
  );
}

function MessageBubble({ theme, message, isOwn }: { theme: Theme; message: MessageWithMedia; isOwn: boolean }) {
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <Bubble theme={theme} message={message} isOwn={isOwn} />
    </View>
  );
}

export function Bubble({
  theme,
  message,
  isOwn,
}: {
  theme: Theme;
  message: MessageWithMedia;
  isOwn: boolean;
}) {
  const stickers = message.media.filter(m => m.kind === 'sticker');
  const photos = message.media.filter(m => m.kind === 'photo' || m.kind === 'gif');
  const videos = message.media.filter(m => m.kind === 'video');
  const hasMediaAttached = stickers.length + photos.length + videos.length > 0;

  // スタンプのみ＆本文なしの場合は、バブルを省略して大きめに表示
  const stickerOnly = stickers.length > 0 && !message.body && photos.length === 0 && videos.length === 0;

  if (stickerOnly) {
    return (
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
    );
  }

  // テキストがなく、画像のみのときはバブル背景なしで画像だけ表示
  const photoOnly = photos.length > 0 && !message.body && stickers.length === 0;
  if (photoOnly) {
    return (
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
    );
  }

  // 通常のテキスト/混在バブル
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
  );
}

// expo-file-system から来るパスは / で始まる絶対パス。expo-image は file:// が必要。
function localUri(localPath: string): string {
  if (localPath.startsWith('file://')) return localPath;
  if (localPath.startsWith('/')) return 'file://' + localPath;
  return localPath;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { opacity: 0.6, textAlign: 'center', marginTop: 40 },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  listPad: { padding: 12, paddingLeft: 30 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  graphButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  graphButtonText: { fontSize: 13 },

  viewToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewToggleItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: 'center',
  },
  viewToggleText: { fontSize: 13, fontWeight: '500' },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateRowText: { fontSize: 14 },
  dateRowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateRowCount: { fontSize: 12 },
  dateRowChevron: { fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  catRow: { gap: 8, paddingBottom: 10 },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: { fontSize: 12 },
  filterChipTextActive: { color: '#fff' },
  emptyFiltered: { opacity: 0.6, textAlign: 'center', padding: 24 },

  chapterCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
  },
  chapterSeparator: {
    height: 1,
    backgroundColor: 'rgba(138, 168, 120, 0.5)',
    marginHorizontal: 4,
    marginVertical: 15,
  },
  mark: { fontSize: 13 },
  chapterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  chapterTitle: { fontSize: 15, flex: 1 },
  chapterSummary: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, color: '#fff' },


  ctaBox: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
  },
  ctaText: { fontSize: 13, opacity: 0.85, lineHeight: 20 },

  dateHeader: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dateHeaderText: { fontSize: 12, opacity: 0.75 },
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
