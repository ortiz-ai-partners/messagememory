import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components/loading-screen';
import { Colors } from '@/constants/theme';
import { openDb } from '@/src/db';

// ネイティブのスプラッシュを自分で制御する
SplashScreen.preventAutoHideAsync().catch(() => {});

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

// Tipを読んでもらうための最低表示時間
const MIN_LOADING_MS = 5000;

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          openDb(),                                                        // DB起動
          new Promise<void>(resolve => setTimeout(resolve, MIN_LOADING_MS)),
        ]);
      } catch {
        // 失敗してもアプリは起動させる（後段でリカバリする）
      }
      if (!cancelled) {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <LoadingScreen />;

  return (
    <ThemeProvider value={WoodNavTheme}>
      <Stack screenOptions={{ headerBackTitle: '戻る' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="import" options={{ title: 'インポート', presentation: 'modal' }} />
        <Stack.Screen name="conversation/[id]" options={{ title: '会話', headerBackTitle: '本棚' }} />
        <Stack.Screen name="chapter/[id]" options={{ title: 'トピック' }} />
        <Stack.Screen name="stats/[id]" options={{ title: 'カテゴリ分布' }} />
        <Stack.Screen name="stats/all" options={{ title: '本棚全体' }} />
        <Stack.Screen name="help" options={{ title: '使い方' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
