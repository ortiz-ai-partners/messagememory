// Metro bundler の設定。
// Web ビルド時に expo-sqlite が wa-sqlite の .wasm ファイルを読み込むため、
// アセット拡張子に 'wasm' を追加する。

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
