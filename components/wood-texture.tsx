// 背景に薄く重ねる木目テクスチャ。
// react-native-svg で柔らかく波打つ線を複数描画し、タッチは透過させる。
// 常に画面全体を覆うよう絶対配置される。

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// 1タイル（TILE_HEIGHT px）内に描く線の配置。y座標・線幅・不透明度を
// 手動で散らすことで、機械的な等間隔にならないようにしている。
const GRAIN_LINES = [
  { y: 22, w: 0.7, op: 0.12 },
  { y: 58, w: 0.4, op: 0.10 },
  { y: 98, w: 0.9, op: 0.14 },
  { y: 142, w: 0.5, op: 0.105 },
  { y: 190, w: 0.7, op: 0.12 },
  { y: 235, w: 1.0, op: 0.15 },
  { y: 278, w: 0.4, op: 0.10 },
  { y: 320, w: 0.6, op: 0.11 },
  { y: 365, w: 0.8, op: 0.13 },
];

const TILE_HEIGHT = 400;
const STROKE = '#8b6f47';

export function WoodTexture() {
  const { width, height } = useWindowDimensions();
  const tiles = Math.ceil(height / TILE_HEIGHT) + 1;

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFillObject}>
      <Svg width={width} height={tiles * TILE_HEIGHT}>
        {Array.from({ length: tiles }).flatMap((_, t) =>
          GRAIN_LINES.map((line, i) => {
            const y = t * TILE_HEIGHT + line.y;
            // tile / row ごとに違う揺らぎを作る（sinで静的に決定）
            const seed = t * 7 + i;
            const amp = 2 + ((seed * 13) % 5); // 2〜6
            const w1 = Math.sin(seed * 1.3) * amp;
            const w2 = Math.sin(seed * 2.1) * amp * 0.6;
            return (
              <Path
                key={`${t}-${i}`}
                d={`M 0 ${y} Q ${width * 0.33} ${y + w1} ${width * 0.66} ${y + w2} T ${width} ${y}`}
                stroke={STROKE}
                strokeWidth={line.w}
                fill="none"
                opacity={line.op}
              />
            );
          }),
        )}
      </Svg>
    </View>
  );
}
