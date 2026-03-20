import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useVoice } from '@/hooks/use-voice';

type SpeechModule = {
  ExpoSpeechRecognitionModule: {
    start: (options: {
      lang: string;
      interimResults: boolean;
      requiresOnDeviceRecognition: boolean;
      continuous: boolean;
    }) => void;
    stop: () => void;
    isRecognitionAvailable: () => Promise<boolean>;
  };
  useSpeechRecognitionEvent: (
    event: string,
    callback: (ev: { results?: { transcript: string }[]; error?: string }) => void
  ) => void;
};

let speechModule: SpeechModule | null = null;
try {
  speechModule = require('expo-speech-recognition');
} catch {
  // Module not installed — voice screen will show setup instructions
}

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'fil-PH', label: 'Filipino' },
] as const;

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { addLog } = useVoice();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('en-US');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Check availability on mount
  useEffect(() => {
    if (!speechModule) {
      setAvailable(false);
      return;
    }
    speechModule.ExpoSpeechRecognitionModule.isRecognitionAvailable()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  // Register speech events
  if (speechModule) {
    speechModule.useSpeechRecognitionEvent('result', (ev) => {
      const text = ev.results?.[0]?.transcript;
      if (text) setTranscript(text);
    });

    speechModule.useSpeechRecognitionEvent('end', () => {
      setIsListening(false);
      stopPulse();
    });

    speechModule.useSpeechRecognitionEvent('error', (ev) => {
      console.warn('Speech recognition error:', ev.error);
      setIsListening(false);
      stopPulse();
    });
  }

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleToggleListening = useCallback(async () => {
    if (!speechModule) return;

    if (isListening) {
      speechModule.ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      stopPulse();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTranscript('');
    setSaved(false);
    setStartTime(Date.now());
    setIsListening(true);
    startPulse();

    speechModule.ExpoSpeechRecognitionModule.start({
      lang: selectedLang,
      interimResults: true,
      requiresOnDeviceRecognition: true,
      continuous: true,
    });
  }, [isListening, selectedLang, startPulse, stopPulse]);

  const handleSave = useCallback(async () => {
    if (!transcript.trim()) return;

    const durationMs = startTime ? Date.now() - startTime : 0;
    await addLog({
      transcript: transcript.trim(),
      language: selectedLang,
      durationMs,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTranscript('');
  }, [transcript, selectedLang, startTime, addLog]);

  const handleClose = useCallback(() => {
    if (isListening && speechModule) {
      speechModule.ExpoSpeechRecognitionModule.stop();
    }
    router.back();
  }, [isListening]);

  // Fallback: no speech module
  if (available === false) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.background }}
      >
        <View className="w-20 h-20 rounded-full bg-surface dark:bg-surface-dark items-center justify-center mb-4">
          <Ionicons name="mic-off" size={40} color={colors.textMuted} />
        </View>
        <Text className="text-text-primary dark:text-text-primary-dark text-xl font-semibold mb-2 text-center">
          Voice Recognition Unavailable
        </Text>
        <Text className="text-text-muted dark:text-text-muted-dark text-center mb-6 leading-5">
          Install expo-speech-recognition and rebuild with a development client to enable on-device voice recognition.
          {'\n\n'}
          Run: npx expo install expo-speech-recognition
        </Text>
        <Pressable onPress={handleClose} className="bg-primary px-6 py-3 rounded-2xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={handleClose} className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center">
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold">
          Voice Mode
        </Text>
        <View className="w-10" />
      </View>

      {/* Language Selector */}
      <View className="flex-row justify-center gap-3 px-6 mb-6">
        {LANGUAGES.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => !isListening && setSelectedLang(lang.code)}
            className={`px-5 py-2.5 rounded-full ${
              selectedLang === lang.code ? 'bg-primary' : 'bg-surface dark:bg-surface-dark'
            }`}
          >
            <Text className={`text-sm font-medium ${
              selectedLang === lang.code
                ? 'text-white'
                : 'text-text-primary dark:text-text-primary-dark'
            }`}>
              {lang.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Transcript Area */}
      <ScrollView
        className="flex-1 mx-6 mb-4 bg-surface dark:bg-surface-dark rounded-3xl p-5"
        showsVerticalScrollIndicator={false}
      >
        {transcript ? (
          <Text className="text-text-primary dark:text-text-primary-dark text-base leading-6">
            {transcript}
          </Text>
        ) : (
          <Text className="text-text-muted dark:text-text-muted-dark text-base text-center mt-8">
            {isListening ? 'Listening...' : 'Tap the mic to start speaking'}
          </Text>
        )}
      </ScrollView>

      {/* Controls */}
      <View className="items-center pb-8" style={{ paddingBottom: insets.bottom + 16 }}>
        {saved && (
          <Text className="text-secondary text-sm font-medium mb-3">Saved to voice log</Text>
        )}

        <View className="flex-row items-center gap-6">
          {/* Save Button */}
          {transcript.trim().length > 0 && !isListening && (
            <Pressable
              onPress={handleSave}
              className="w-14 h-14 rounded-full bg-secondary/20 items-center justify-center"
            >
              <Ionicons name="checkmark" size={28} color="#05DF72" />
            </Pressable>
          )}

          {/* Mic Button */}
          <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
            <Pressable
              onPress={handleToggleListening}
              className={`w-20 h-20 rounded-full items-center justify-center ${
                isListening ? 'bg-expense' : 'bg-primary'
              }`}
              style={{
                shadowColor: isListening ? '#FF6B6B' : '#0084D1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons
                name={isListening ? 'stop' : 'mic'}
                size={36}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>

          {/* Clear Button */}
          {transcript.trim().length > 0 && !isListening && (
            <Pressable
              onPress={() => { setTranscript(''); setSaved(false); }}
              className="w-14 h-14 rounded-full bg-expense/20 items-center justify-center"
            >
              <Ionicons name="trash" size={24} color="#FF6B6B" />
            </Pressable>
          )}
        </View>

        {isListening && (
          <Text className="text-expense text-sm font-medium mt-3">
            Recording...
          </Text>
        )}
      </View>
    </View>
  );
}
