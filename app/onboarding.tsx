import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WoodTexture } from '@/components/wood-texture';
import { markOnboarded, setGender, type Gender } from '@/src/secrets/preferences';

const OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'other', label: '回答しない・その他' },
];

export default function OnboardingScreen() {
  const [selected, setSelected] = useState<Gender | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setBusy(true);
    await setGender(selected);
    await markOnboarded();
    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <WoodTexture />
      <View style={styles.center}>
        <ThemedText type="title" style={styles.title}>
          ようこそ
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          大切な会話を、一冊の本のように残すアプリです。
        </ThemedText>

        <View style={styles.question}>
          <ThemedText type="subtitle" style={styles.questionText}>
            あなたの性別を教えてください
          </ThemedText>
          <ThemedText style={styles.hint}>
            サンプルの並び順などに使います。いつでも変更できます。
          </ThemedText>
        </View>

        <View style={styles.options}>
          {OPTIONS.map(opt => {
            const active = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSelected(opt.value)}
                style={[styles.option, active && styles.optionActive]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.optionText, active && styles.optionTextActive]}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.continueButton, (!selected || busy) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected || busy}>
          <ThemedText type="defaultSemiBold" style={styles.continueButtonText}>
            はじめる
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 12, opacity: 0.7, lineHeight: 22 },
  question: { marginTop: 48 },
  questionText: { textAlign: 'center' },
  hint: { textAlign: 'center', fontSize: 12, opacity: 0.6, marginTop: 6 },
  options: { marginTop: 24, gap: 10 },
  option: {
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d6c5a4',
    alignItems: 'center',
  },
  optionActive: { backgroundColor: '#8b6f47', borderColor: '#8b6f47' },
  optionText: { fontSize: 15 },
  optionTextActive: { color: '#fff' },
  continueButton: {
    marginTop: 40,
    backgroundColor: '#8b6f47',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  continueButtonDisabled: { opacity: 0.35 },
  continueButtonText: { color: '#fff', fontSize: 16 },
});
