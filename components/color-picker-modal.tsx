// 会話の「背表紙の色」を選ぶモーダル。
// 木目調のパレットに合う8色 + デフォルトを並べる。

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export const SPINE_COLORS: { name: string; value: string | null }[] = [
  { name: 'デフォルト', value: null },
  { name: 'ハニー', value: '#c8a878' },
  { name: 'ローズ', value: '#d9889a' },
  { name: 'サフラン', value: '#d8a05a' },
  { name: 'セージ', value: '#8aa878' },
  { name: 'ラベンダー', value: '#b388c4' },
  { name: 'スカイ', value: '#7ba0c2' },
  { name: 'カカオ', value: '#a08870' },
  { name: 'グレー', value: '#a8a28f' },
];

type Props = {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onPick: (value: string | null) => void;
};

export function ColorPickerModal({ visible, current, onClose, onPick }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.borderSoft }]}
          onPress={() => {}}>
          <ThemedText type="subtitle" style={styles.title}>
            背表紙の色
          </ThemedText>
          <ThemedText style={[styles.hint, { color: theme.textMuted }]}>
            本棚で見分けやすい色を選んでください。
          </ThemedText>

          <View style={styles.grid}>
            {SPINE_COLORS.map(c => {
              const isCurrent = (current ?? null) === c.value;
              const swatch = c.value ?? '#e8d6b3'; // null は薄い木色を表示
              return (
                <Pressable
                  key={c.name}
                  style={styles.swatchWrap}
                  onPress={() => {
                    onPick(c.value);
                    onClose();
                  }}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: swatch },
                      isCurrent && { borderColor: theme.text, borderWidth: 2.5 },
                    ]}>
                    {c.value === null ? (
                      <ThemedText style={styles.defaultMark}>—</ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={styles.swatchLabel}>{c.name}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <ThemedText type="defaultSemiBold" style={{ color: theme.tint }}>
              キャンセル
            </ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    padding: 22,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { marginBottom: 6 },
  hint: { fontSize: 12, marginBottom: 16, lineHeight: 18 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  swatchWrap: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 14,
  },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: 'transparent',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultMark: { fontSize: 22, color: '#8b6f47' },
  swatchLabel: { fontSize: 11, marginTop: 6 },

  closeBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
});
