// BYOK: ユーザーのAnthropic APIキーをOSキーチェーンに安全に保管する。
// Phase 3 で実装予定。iOS Keychain / Android Keystore を利用。

import * as SecureStore from 'expo-secure-store';

const KEY = 'anthropic_api_key';

export async function saveApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}

export async function loadApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
