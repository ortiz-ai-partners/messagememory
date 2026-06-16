// 全画面の固定背景として、木目テクスチャ画像を低不透明度で重ねる。
// スクロールしてもテクスチャは動かない（absoluteFillObject による固定）。
// Web ではrender されない（react-native-web 由来の不具合回避と過剰な重ねを避けるため）。

import { Image, Platform, StyleSheet, View } from 'react-native';

export function WoodTexture() {
  if (Platform.OS === 'web') return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Image
        source={require('@/assets/images/wood-texture.png')}
        style={[StyleSheet.absoluteFillObject, styles.texture]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  texture: {
    opacity: 1.0,
  },
});
