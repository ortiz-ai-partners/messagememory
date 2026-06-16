// アプリ起動直後に表示するローディング画面。
// スプラッシュと同じ背景画像を全画面に敷き、画面下部に半透明フレームで
// ランダムな Tip を表示する。

import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const TIPS = [
  '会話を話題ごとに章立てして、いつでも好きなページが開けます',
  '⭐ 重要な会話 と 💗 心の栄養素、2種類の栞で残せます',
  'カテゴリで絞り込めば、見たい思い出にすぐ会えます',
  '📊 会話グラフで、ふたりの会話の輪郭が見えてきます',
  '写真もスタンプもまるごと、思い出の本に綴じておけます',
  'あなたの会話は端末の中だけで大切に守られます',
];

export function LoadingScreen() {
  // 起動ごとにランダムな Tip を1つ選ぶ（再レンダリングでは変わらない）
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  // ネイティブスプラッシュを隠し、このJS製のローディング画面を見せる
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <Image
        source={require('@/assets/images/splash.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="contain"
      />
      <View style={styles.bottomArea}>
        <View style={styles.tipFrame}>
          <Text style={styles.tipLabel}>♢  TIP</Text>
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fdfaf3',
  },
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 90,
    paddingHorizontal: 28,
  },
  tipFrame: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(253, 250, 243, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139, 111, 71, 0.22)',
    shadowColor: '#5a4528',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 6,
  },
  tipLabel: {
    fontSize: 10,
    color: '#8b6f47',
    fontWeight: '600',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: '#3e2f1e',
    lineHeight: 22,
  },
});
