// アプリ全体を「クリーム色の本」世界観に統一するため、ライトモード固定とする。
// 将来ダークモード対応する場合はここを `react-native` の useColorScheme に戻す。

export function useColorScheme(): 'light' {
  return 'light';
}
