import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** 現在のテーマ（light/dark）のカラーセットをまとめて返す。 */
export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}
