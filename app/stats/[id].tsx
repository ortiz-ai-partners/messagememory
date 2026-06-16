import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { CategoryColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateCommentary } from '@/src/ai/commentary';
import { openDb } from '@/src/db';
import {
  countChaptersByCategory,
  getConversation,
  getConversationDateRange,
  setConversationCommentary,
  type CategoryCount,
  type ConversationRow,
} from '@/src/db/queries';
import { loadApiKey } from '@/src/secrets/apiKeyStore';

const CHART_SIZE = 240;
const RADIUS = CHART_SIZE / 2;
const CX = RADIUS;
const CY = RADIUS;

function polar(cx: number, cy: number, r: number, angleRad: number): [number, number] {
  return [cx + r * Math.cos(angleRad - Math.PI / 2), cy + r * Math.sin(angleRad - Math.PI / 2)];
}

function arcPath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const [x1, y1] = polar(cx, cy, r, startRad);
  const [x2, y2] = polar(cx, cy, r, endRad);
  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  if (endRad - startRad >= Math.PI * 2 - 1e-6) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function StatsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [dateRange, setDateRange] = useState<{ start: number; end: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentaryLoading, setCommentaryLoading] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(conversationId)) return;
    const db = await openDb();
    const [conv, rows, range] = await Promise.all([
      getConversation(db, conversationId),
      countChaptersByCategory(db, conversationId),
      getConversationDateRange(db, conversationId),
    ]);
    setConversation(conv);
    setCounts(rows);
    setDateRange(range);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  // 章があるのに感想が未生成の場合、自動で1回生成する
  useEffect(() => {
    if (loading) return;
    if (!conversation) return;
    if (counts.length === 0) return;
    if (conversation.ai_commentary) return;
    generateNow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversation?.id, counts.length]);

  async function generateNow(notifyOnError: boolean) {
    if (!conversation || counts.length === 0 || !dateRange) return;
    const apiKey = await loadApiKey();
    if (!apiKey) {
      if (notifyOnError) {
        Alert.alert('APIキー未設定', '設定画面で Anthropic API キーを登録してください。');
      }
      return;
    }
    setCommentaryLoading(true);
    try {
      const total = counts.reduce((a, c) => a + c.count, 0);
      const text = await generateCommentary(apiKey, {
        title: conversation.title,
        startDate: new Date(dateRange.start).toLocaleDateString('ja-JP'),
        endDate: new Date(dateRange.end).toLocaleDateString('ja-JP'),
        categories: counts.map(c => ({
          name: c.category,
          count: c.count,
          percent: Math.round((c.count / total) * 100),
        })),
      });
      const db = await openDb();
      await setConversationCommentary(db, conversation.id, text);
      setConversation({ ...conversation, ai_commentary: text, ai_commentary_at: Date.now() });
    } catch (e) {
      if (notifyOnError) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('生成エラー', msg);
      }
    } finally {
      setCommentaryLoading(false);
    }
  }

  function jumpToCategory(category: string) {
    // 会話の記憶画面に戻りつつ、そのカテゴリで絞り込み状態にする
    router.replace({
      pathname: '/conversation/[id]',
      params: { id: String(conversationId), category },
    });
  }

  const total = counts.reduce((acc, c) => acc + c.count, 0);

  const slices = (() => {
    let cursor = 0;
    return counts.map(c => {
      const start = cursor;
      const angle = (c.count / total) * Math.PI * 2;
      cursor += angle;
      return {
        category: c.category,
        count: c.count,
        start,
        end: cursor,
        color: CategoryColors[c.category] ?? '#b5ac95',
      };
    });
  })();

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <Stack.Screen options={{ title: '会話グラフ' }} />

      {loading ? (
        <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
      ) : total === 0 ? (
        <ThemedText style={styles.placeholder}>
          まだ会話の記憶がありません。会話画面で「記憶に分ける」を実行してください。
        </ThemedText>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            {conversation?.title ?? ''}
          </ThemedText>

          {dateRange ? (
            <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
              {formatDate(dateRange.start)} 〜 {formatDate(dateRange.end)}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
            全 {total} 記憶 ・ {dateRange?.count ?? 0} メッセージ
          </ThemedText>

          {/* 円グラフ */}
          <View style={styles.chartWrap}>
            <Svg width={CHART_SIZE} height={CHART_SIZE}>
              <G>
                {slices.map(s => (
                  <Path
                    key={s.category}
                    d={arcPath(CX, CY, RADIUS, s.start, s.end)}
                    fill={s.color}
                    stroke={theme.background}
                    strokeWidth={2}
                    onPress={() => jumpToCategory(s.category)}
                  />
                ))}
              </G>
            </Svg>
            <ThemedText style={[styles.tapHint, { color: theme.textMuted }]}>
              カテゴリをタップで絞り込み表示
            </ThemedText>
          </View>

          {/* 凡例（タップ可能） */}
          <View style={styles.legend}>
            {slices.map(s => (
              <Pressable
                key={s.category}
                style={styles.legendRow}
                onPress={() => jumpToCategory(s.category)}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <ThemedText style={styles.legendLabel}>{s.category}</ThemedText>
                <ThemedText style={[styles.legendCount, { color: theme.textMuted }]}>
                  {s.count} / {Math.round((s.count / total) * 100)}%
                </ThemedText>
                <ThemedText style={[styles.chevron, { color: theme.textMuted }]}>›</ThemedText>
              </Pressable>
            ))}
          </View>

          {/* AI感想（最下部、グラフと割合を見てから） */}
          <View style={[styles.commentaryBox, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.commentaryHeader}>
              <ThemedText style={[styles.commentaryLabel, { color: theme.tint }]}>
                ♢  この会話の輪郭
              </ThemedText>
              <Pressable onPress={() => generateNow(true)} hitSlop={6} disabled={commentaryLoading}>
                <ThemedText style={[styles.regen, { color: theme.tint }]}>
                  {commentaryLoading ? '...' : '更新'}
                </ThemedText>
              </Pressable>
            </View>
            {commentaryLoading && !conversation?.ai_commentary ? (
              <View style={styles.commentaryLoading}>
                <ActivityIndicator color={theme.tint} />
              </View>
            ) : conversation?.ai_commentary ? (
              <ThemedText style={styles.commentaryText}>{conversation.ai_commentary}</ThemedText>
            ) : (
              <ThemedText style={[styles.commentaryHint, { color: theme.textMuted }]}>
                APIキーを設定すると、ふたりの会話の輪郭をAIが3文で表現します。
              </ThemedText>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  placeholder: { opacity: 0.6, textAlign: 'center', marginTop: 60, paddingHorizontal: 24 },
  title: { textAlign: 'center', marginTop: 8 },
  subtitle: { textAlign: 'center', marginTop: 4, fontSize: 13 },

  commentaryBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  commentaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentaryLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  regen: { fontSize: 13 },
  commentaryLoading: { padding: 12, alignItems: 'center' },
  commentaryText: { fontSize: 14, lineHeight: 24 },
  commentaryHint: { fontSize: 13, lineHeight: 20 },

  chartWrap: { alignItems: 'center', marginVertical: 20 },
  tapHint: { fontSize: 11, marginTop: 8 },

  legend: { marginTop: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  legendLabel: { flex: 1 },
  legendCount: { fontSize: 13, marginRight: 8 },
  chevron: { fontSize: 18 },
});
