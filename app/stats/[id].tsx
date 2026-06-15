import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { CategoryColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openDb } from '@/src/db';
import { countChaptersByCategory, getConversation, type CategoryCount, type ConversationRow } from '@/src/db/queries';

const CHART_SIZE = 240;
const RADIUS = CHART_SIZE / 2;
const CX = RADIUS;
const CY = RADIUS;

function polar(cx: number, cy: number, r: number, angleRad: number): [number, number] {
  // 12時を起点に時計回りに描画
  return [cx + r * Math.cos(angleRad - Math.PI / 2), cy + r * Math.sin(angleRad - Math.PI / 2)];
}

function arcPath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const [x1, y1] = polar(cx, cy, r, startRad);
  const [x2, y2] = polar(cx, cy, r, endRad);
  const largeArc = endRad - startRad > Math.PI ? 1 : 0;
  // 完全一周（360°）はパスで描けないのでそのケースのみ特別処理
  if (endRad - startRad >= Math.PI * 2 - 1e-6) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function StatsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [counts, setCounts] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(conversationId)) return;
    const db = await openDb();
    const [conv, rows] = await Promise.all([
      getConversation(db, conversationId),
      countChaptersByCategory(db, conversationId),
    ]);
    setConversation(conv);
    setCounts(rows);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const total = counts.reduce((acc, c) => acc + c.count, 0);

  // 描画用スライスを準備（開始角・終了角を累積）
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
      <Stack.Screen options={{ title: 'カテゴリ分布' }} />

      {loading ? (
        <ThemedText style={styles.placeholder}>読み込み中...</ThemedText>
      ) : total === 0 ? (
        <ThemedText style={styles.placeholder}>
          まだトピック分類がありません。会話画面で「トピック分類」を実行してください。
        </ThemedText>
      ) : (
        <View>
          <ThemedText type="title" style={styles.title}>
            {conversation?.title ?? ''}
          </ThemedText>
          <ThemedText style={styles.subtitle}>全 {total} トピック</ThemedText>

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
                <ThemedText style={styles.legendCount}>
                  {s.count} / {Math.round((s.count / total) * 100)}%
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  placeholder: { opacity: 0.6, textAlign: 'center', marginTop: 60, paddingHorizontal: 24 },
  title: { textAlign: 'center', marginTop: 8 },
  subtitle: { textAlign: 'center', opacity: 0.65, marginTop: 4, fontSize: 13 },
  chartWrap: { alignItems: 'center', marginVertical: 24 },
  legend: { marginTop: 8 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8dcc4',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  legendLabel: { flex: 1 },
  legendCount: { opacity: 0.7, fontSize: 13 },
});
