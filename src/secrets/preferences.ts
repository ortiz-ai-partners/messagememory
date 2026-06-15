// 秘密ではないが端末ローカルで永続化したいユーザー設定。
// 簡便のため expo-secure-store を使用している（AsyncStorage追加を避けるため）。

import * as SecureStore from 'expo-secure-store';

const KEY_GENDER = 'user_gender';
const KEY_ONBOARDED = 'user_onboarded';

export type Gender = 'female' | 'male' | 'other';

export async function getGender(): Promise<Gender | null> {
  const v = await SecureStore.getItemAsync(KEY_GENDER);
  if (v === 'female' || v === 'male' || v === 'other') return v;
  return null;
}

export async function setGender(value: Gender): Promise<void> {
  await SecureStore.setItemAsync(KEY_GENDER, value);
}

export async function isOnboarded(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY_ONBOARDED)) === '1';
}

export async function markOnboarded(): Promise<void> {
  await SecureStore.setItemAsync(KEY_ONBOARDED, '1');
}

export async function resetOnboarding(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ONBOARDED);
  await SecureStore.deleteItemAsync(KEY_GENDER);
}
