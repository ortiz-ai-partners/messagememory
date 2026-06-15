/**
 * 木目調（やわらかい、あたたかい）パレット。
 * 大切な人との会話を「本棚に残す」世界観に合わせて、
 * 青系のシャープな配色から、クリーム・木・蜂蜜・ヴィンテージの色へ。
 */

import { Platform } from 'react-native';

// ベースの木の色
const wood = {
  cream: '#fdfaf3',        // いちばん薄い紙のような色
  paper: '#f5ecd9',        // カード背景（薄い木肌）
  light: '#e8d6b3',        // 章の枠など
  medium: '#c8a878',       // アクセント（蜂蜜）
  dark: '#8b6f47',         // 主要アクション（あたたかいブラウン）
  deep: '#5a4528',         // 見出し・強調
  ink: '#3e2f1e',          // 濃い本文テキスト
};

const darkWood = {
  cream: '#2b2620',
  paper: '#3a332b',
  light: '#4a4135',
  medium: '#8b6f47',
  dark: '#d4a373',
  deep: '#e8d6b3',
  ink: '#f5ecd9',
};

export const Colors = {
  light: {
    text: wood.ink,
    textMuted: '#7a6a52',
    background: wood.cream,
    surface: wood.paper,
    surfaceAlt: '#faf3e3',
    border: '#d6c5a4',
    borderSoft: '#e8dcc4',

    tint: wood.dark,
    accent: wood.medium,

    bubbleOwn: wood.medium,
    bubbleOwnText: '#fff',
    bubbleOther: wood.paper,
    bubbleOtherText: wood.ink,
    senderLabel: '#9b8568',

    icon: '#8a7556',
    tabIconDefault: '#8a7556',
    tabIconSelected: wood.dark,

    danger: '#b5533b',
    pin: '#c88a3a',
  },
  dark: {
    text: darkWood.ink,
    textMuted: '#b0a28a',
    background: darkWood.cream,
    surface: darkWood.paper,
    surfaceAlt: '#463c31',
    border: '#5a4e3e',
    borderSoft: '#463c31',

    tint: darkWood.dark,
    accent: darkWood.medium,

    bubbleOwn: '#a67c52',
    bubbleOwnText: '#fff',
    bubbleOther: darkWood.paper,
    bubbleOtherText: darkWood.ink,
    senderLabel: '#b0a28a',

    icon: '#b0a28a',
    tabIconDefault: '#b0a28a',
    tabIconSelected: darkWood.dark,

    danger: '#c96a4c',
    pin: '#d4a373',
  },
};

// カテゴリバッジ用の色。木目調に馴染むよう、彩度を落として温かい寄りに調整
export const CategoryColors: Record<string, string> = {
  '雑談': '#a8a28f',
  'デート・お出かけ': '#d9889a',
  '大切な出来事': '#d8a05a',
  '旅行': '#8aa878',
  '記念日・お祝い': '#b388c4',
  '日常の報告': '#7ba0c2',
  '相談ごと': '#a08870',
  'その他': '#b5ac95',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
