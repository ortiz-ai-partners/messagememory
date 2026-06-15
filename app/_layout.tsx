import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// ナビゲーション（ヘッダー・タブバー）の色も木目パレットに合わせる
const WoodNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.surfaceAlt,
    text: Colors.light.text,
    border: Colors.light.borderSoft,
    notification: Colors.light.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={WoodNavTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="import" options={{ title: 'インポート', presentation: 'modal' }} />
        <Stack.Screen name="conversation/[id]" options={{ title: '会話' }} />
        <Stack.Screen name="chapter/[id]" options={{ title: 'トピック' }} />
        <Stack.Screen name="stats/[id]" options={{ title: 'カテゴリ分布' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
