import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { CategoryColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateOverallCommentary } from '@/src/ai/commentary';
import { openDb } from '@/src/db';
import {
  countAllChaptersByCategory,
  getAppMeta,
  getConversationsForOverallCommentary,
  getOverallStats,
  setAppMeta,
  type CategoryCount,
} from '@/src/db/queries';
import { loadApiKey } from '@/src/secrets/apiKeyStore';

const OVERALL_COMMENTARY_KEY = 'overall_commentary';
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

export default function AllStatsScreen() {
  const theme = useTheme();
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [overall, setOverall] = useState<{
    conversationCount: number;
    chapterCount: number;
    messageCount: number;
    startDate: number | null;
    endDate: number | null;
  } | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const db = await openDb();
    const [rows, ov, meta] = await Promise.all([
      countAllChaptersByCategory(db),
      getOverallStats(db),
      getAppMeta(db, OVERALL_COMMENTARY_KEY),
    ]);
    setCounts(rows);
    setOverall(ov);
    setCommentary(meta?.value ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 章があるのに本棚全体の感想が未生成なら、自動で1回生成する
  useEffect(() => {
    if (loading) return;
    if (!overall || overall.chapterCount === 0) return;
    if (commentary) return;
    generateNow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, overall?.chapterCount]);

  async function generateNow(notifyOnError: boolean) {
    if (!overall || overall.chapterCount === 0 || !overall.startDate || !overall.endDate) return;
    const apiKey = await loadApiKey();
    if (!apiKey) {
      if (notifyOnError) {
        Alert.alert('APIキー未設定', '設定画面で Anthropic API キーを登録してください。');
      }
      return;
    }
    setCommentaryLoading(true);
    try {
      const db = await openDb();
      const books = await getConversationsForOverallCommentary(db);
      const total = counts.reduce((a, c) => a + c.count, 0);
      const text = await generateOverallCommentary(apiKey, {
        conversationCount: overall.conversationCount,
        chapterCount: overall.chapterCount,
        messageCount: overall.messageCount,
        startDate: new Date(overall.startDate).toLocaleDateString('ja-JP'),
        endDate: new Date(overall.endDate).toLocaleDateString('ja-JP'),
        categories: counts.map(c => ({
          name: c.category,
          count: c.count,
          percent: Math.round((c.count / total) * 100),
        })),
        books: books.map(b => ({ title: b.title, commentary: b.ai_commentary })),
      });
      await setAppMeta(db, OVERALL_COMMENTARY_KEY, text);
      setCommentary(text);
    } catch (e) {
      if (notifyOnError) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('生成エラー', msg);
      }
    } finally {
      setCommentaryLoading(false);
    }
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
      <Stack.Screen options={{ title: '本棚全体' }} />

      {loading ? (
        <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
      ) : total === 0 ? (
        <ThemedText style={styles.placeholder}>
          まだ会話の記憶がありません。会話を取り込んで「記憶に分ける」を実行してください。
        </ThemedText>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            本棚全体
          </ThemedText>

          {overall ? (
            <>
              <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
                {overall.conversationCount} 冊 ・ {overall.chapterCount} の記憶 ・ {overall.messageCount.toLocaleString()} メッセージ
              </ThemedText>
              {overall.startDate && overall.endDate ? (
                <ThemedText style={[styles.subtitle, { color: theme.textMuted }]}>
                  {formatDate(overall.startDate)} 〜 {formatDate(overall.endDate)}
                </ThemedText>
              ) : null}
            </>
          ) : null}

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
                  />
                ))}
              </G>
            </Svg>
          </View>

          <View style={styles.legend}>
            {slices.map(s => (
              <View key={s.category} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <ThemedText style={styles.legendLabel}>{s.category}</ThemedText>
                <ThemedText style={[styles.legendCount, { color: theme.textMuted }]}>
                  {s.count} / {Math.round((s.count / total) * 100)}%
                </ThemedText>
              </View>
            ))}
          </View>

          {/* AI感想 - 各本の感想をさらに要約 */}
          <View style={[styles.commentaryBox, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.commentaryHeader}>
              <ThemedText style={[styles.commentaryLabel, { color: theme.tint }]}>
                ♢  本棚全体の輪郭
              </ThemedText>
              <Pressable onPress={() => generateNow(true)} hitSlop={6} disabled={commentaryLoading}>
                <ThemedText style={[styles.regen, { color: theme.tint }]}>
                  {commentaryLoading ? '...' : '更新'}
                </ThemedText>
              </Pressable>
            </View>
            {commentaryLoading && !commentary ? (
              <View style={styles.commentaryLoading}>
                <ActivityIndicator color={theme.tint} />
              </View>
            ) : commentary ? (
              <ThemedText style={styles.commentaryText}>{commentary}</ThemedText>
            ) : (
              <ThemedText style={[styles.commentaryHint, { color: theme.textMuted }]}>
                各本の感想をさらに要約して、本棚全体の輪郭をAIが3文で描きます。
                APIキーを設定してください。
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

  chartWrap: { alignItems: 'center', marginVertical: 24 },

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
  legendCount: { fontSize: 13 },

  commentaryBox: {
    marginTop: 24,
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
});
