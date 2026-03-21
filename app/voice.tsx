import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactions } from '@/hooks/use-transactions';
import { useVoice } from '@/hooks/use-voice';
import { createAIService } from '@/modules/ai/ai.service';
import type { ParsedTransaction } from '@/modules/ai/ai.types';
import { createWhisperService } from '@/modules/voice/whisper.service';
import {
    downloadModel,
    getModelSize,
    isModelDownloaded,
} from '@/services/model-manager';
import { useAccountStore } from '@/state/account.store';
import { useCategoryStore } from '@/state/category.store';

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (granted) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'auto', label: 'Auto' },
] as const;

type ScreenState =
  | 'loading'
  | 'setup'
  | 'ready'
  | 'recording'
  | 'transcribed'
  | 'parsing'
  | 'parsed';

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { addLog } = useVoice();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();
  const { add: addTransaction } = useTransactions();
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [transcript, setTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [parsedTx, setParsedTx] = useState<ParsedTransaction | null>(null);
  const [txSaved, setTxSaved] = useState(false);

  // Model download state
  const [whisperReady, setWhisperReady] = useState(false);
  const [llamaReady, setLlamaReady] = useState(false);
  const [downloading, setDownloading] = useState<'whisper' | 'llama' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const whisperServiceRef = useRef(createWhisperService());
  const aiServiceRef = useRef(createAIService());

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Check model status on mount
  useEffect(() => {
    (async () => {
      const [wReady, lReady] = await Promise.all([
        isModelDownloaded('whisper'),
        isModelDownloaded('llama'),
      ]);
      setWhisperReady(wReady);
      setLlamaReady(lReady);

      if (wReady) {
        try {
          await whisperServiceRef.current.init();
          setScreenState('ready');
        } catch {
          setScreenState('setup');
        }
      } else {
        setScreenState('setup');
      }

      // Preload llama if available
      if (lReady) {
        aiServiceRef.current.init().catch(() => {});
      }

      fetchCategories();
      fetchAccounts();
    })();

    return () => {
      whisperServiceRef.current.release();
      aiServiceRef.current.release();
    };
  }, [fetchCategories, fetchAccounts]);

  const handleDownload = useCallback(
    async (type: 'whisper' | 'llama') => {
      setDownloading(type);
      setDownloadProgress(0);
      try {
        await downloadModel(type, setDownloadProgress);
        if (type === 'whisper') {
          setWhisperReady(true);
          await whisperServiceRef.current.init();
          setScreenState('ready');
        } else {
          setLlamaReady(true);
          await aiServiceRef.current.init();
        }
      } catch (e) {
        console.warn(`Failed to download ${type} model:`, e);
      } finally {
        setDownloading(null);
        setDownloadProgress(0);
      }
    },
    [],
  );

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
      ]),
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleStartRecording = useCallback(async () => {
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTranscript('');
    setSaved(false);
    setParsedTx(null);
    setTxSaved(false);
    setStartTime(Date.now());
    setScreenState('recording');
    startPulse();

    try {
      await whisperServiceRef.current.startRealtime(
        selectedLang,
        (text, isFinal) => {
          setTranscript(text);
          if (isFinal) {
            setScreenState('transcribed');
            stopPulse();
          }
        },
        (error) => {
          console.warn('Whisper error:', error);
          setScreenState('ready');
          stopPulse();
        },
      );
    } catch (e) {
      console.warn('Failed to start recording:', e);
      setScreenState('ready');
      stopPulse();
    }
  }, [selectedLang, startPulse, stopPulse]);

  const handleStopRecording = useCallback(async () => {
    await whisperServiceRef.current.stop();
    setScreenState('transcribed');
    stopPulse();
  }, [stopPulse]);

  const handleSaveLog = useCallback(async () => {
    if (!transcript.trim()) return;
    const durationMs = startTime ? Date.now() - startTime : 0;
    await addLog({
      transcript: transcript.trim(),
      language: selectedLang,
      durationMs,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
  }, [transcript, selectedLang, startTime, addLog]);

  const handleParseTransaction = useCallback(async () => {
    if (!transcript.trim()) return;
    setScreenState('parsing');
    const categoryInfo = categories.map((c) => ({ name: c.name, type: c.type }));
    const result = await aiServiceRef.current.parseTranscript(transcript.trim(), categoryInfo);
    setParsedTx(result);
    setScreenState('parsed');
  }, [transcript, categories]);

  const categoryMatch = useMemo(() => {
    if (!parsedTx) return { category: null, confidence: 'none' as const, aiRaw: '' };
    const aiRaw = parsedTx.category;
    const lower = aiRaw.toLowerCase().trim();

    // Exact match (case-insensitive)
    const exact = categories.find((c) => c.name.toLowerCase() === lower);
    if (exact) return { category: exact, confidence: 'exact' as const, aiRaw };

    // Partial match: category name contains parsed or parsed contains category name
    const partial = categories.find(
      (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()),
    );
    if (partial) return { category: partial, confidence: 'partial' as const, aiRaw };

    // Fallback to first expense category
    const fallback = categories.find((c) => c.type === 'expense') ?? null;
    return { category: fallback, confidence: 'fallback' as const, aiRaw };
  }, [parsedTx, categories]);

  const matchedCategory = categoryMatch.category;

  const defaultAccount = useMemo(
    () => accounts.find((a) => a.isDefault) ?? accounts[0] ?? null,
    [accounts],
  );

  const handleConfirmTransaction = useCallback(async () => {
    if (!parsedTx || !matchedCategory || !defaultAccount) return;
    await addTransaction({
      type: matchedCategory.type === 'income' ? 'income' : 'expense',
      amount: parsedTx.amount,
      description: parsedTx.description,
      categoryId: matchedCategory.id,
      accountId: defaultAccount.id,
      date: new Date(parsedTx.date).toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTxSaved(true);
  }, [parsedTx, matchedCategory, defaultAccount, addTransaction]);

  const handleReset = useCallback(() => {
    setTranscript('');
    setSaved(false);
    setParsedTx(null);
    setTxSaved(false);
    setScreenState('ready');
  }, []);

  const handleClose = useCallback(() => {
    if (screenState === 'recording') {
      whisperServiceRef.current.stop();
    }
    router.back();
  }, [screenState]);

  // === SETUP SCREEN ===
  if (screenState === 'loading') {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (screenState === 'setup') {
    return (
      <View className="flex-1 px-6" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleClose} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={{ color: colors.text }} className="text-lg font-bold">Voice Setup</Text>
          <View className="w-10" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="items-center mt-8 mb-8">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.surface }}>
              <Ionicons name="cloud-download-outline" size={40} color={colors.tint} />
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-bold text-center mb-2">
              Download AI Models
            </Text>
            <Text style={{ color: colors.textMuted }} className="text-center leading-5 px-4">
              Voice recognition requires on-device models. Download them once and they work offline.
            </Text>
          </View>

          {/* Whisper Model Card */}
          <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="mic-outline" size={24} color={whisperReady ? '#05DF72' : colors.tint} />
              <View className="ml-3 flex-1">
                <Text style={{ color: colors.text }} className="font-semibold text-base">
                  Whisper STT Model
                </Text>
                <Text style={{ color: colors.textMuted }} className="text-xs">
                  Speech-to-text · ~{Math.round(getModelSize('whisper') / 1_000_000)}MB
                </Text>
              </View>
              {whisperReady && <Ionicons name="checkmark-circle" size={24} color="#05DF72" />}
            </View>
            {!whisperReady && (
              <Pressable
                onPress={() => handleDownload('whisper')}
                disabled={downloading !== null}
                className="py-3 rounded-2xl items-center"
                style={{ backgroundColor: downloading === 'whisper' ? colors.surfaceHover : colors.tint }}
              >
                {downloading === 'whisper' ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-semibold">{downloadProgress}%</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold">Download</Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Llama Model Card */}
          <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="sparkles-outline" size={24} color={llamaReady ? '#05DF72' : colors.tint} />
              <View className="ml-3 flex-1">
                <Text style={{ color: colors.text }} className="font-semibold text-base">
                  TinyLlama AI Model
                </Text>
                <Text style={{ color: colors.textMuted }} className="text-xs">
                  Auto-parse transactions · ~{Math.round(getModelSize('llama') / 1_000_000)}MB · Optional
                </Text>
              </View>
              {llamaReady && <Ionicons name="checkmark-circle" size={24} color="#05DF72" />}
            </View>
            {!llamaReady && (
              <Pressable
                onPress={() => handleDownload('llama')}
                disabled={downloading !== null}
                className="py-3 rounded-2xl items-center"
                style={{ backgroundColor: downloading === 'llama' ? colors.surfaceHover : colors.tint }}
              >
                {downloading === 'llama' ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-semibold">{downloadProgress}%</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold">Download</Text>
                )}
              </Pressable>
            )}
          </View>

          {whisperReady && (
            <View className="mt-4 items-center">
              <Text style={{ color: colors.textMuted }} className="text-sm text-center mb-4">
                Whisper is ready! You can start using voice recognition.
                {!llamaReady ? '\nDownload TinyLlama later for auto-parsing.' : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // === MAIN VOICE SCREEN ===
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={handleClose} className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={{ color: colors.text }} className="text-lg font-bold">Voice Mode</Text>
        <View className="w-10" />
      </View>

      {/* Language Selector */}
      <View className="flex-row justify-center gap-3 px-6 mb-6">
        {LANGUAGES.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => screenState === 'ready' && setSelectedLang(lang.code)}
            className={`px-5 py-2.5 rounded-full ${selectedLang === lang.code ? 'bg-primary' : ''}`}
            style={selectedLang !== lang.code ? { backgroundColor: colors.surface } : undefined}
          >
            <Text
              className={`text-sm font-medium ${selectedLang === lang.code ? 'text-white' : ''}`}
              style={selectedLang !== lang.code ? { color: colors.text } : undefined}
            >
              {lang.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Transcript / Result Area */}
      <ScrollView
        className="flex-1 mx-6 mb-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.surface }}
        showsVerticalScrollIndicator={false}
      >
        {/* Parsed Transaction Preview */}
        {screenState === 'parsed' && parsedTx && (
          <View className="mb-4">
            <Text style={{ color: colors.tint }} className="text-xs font-bold uppercase mb-3">
              Parsed Transaction
            </Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ color: colors.textSecondary }} className="text-sm">Amount</Text>
              <Text style={{ color: colors.text }} className="text-lg font-bold">
                ${parsedTx.amount.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ color: colors.textSecondary }} className="text-sm">Category</Text>
              <View className="flex-row items-center gap-2">
                <Text style={{ color: colors.text }} className="text-base font-medium">
                  {matchedCategory?.name ?? parsedTx.category}
                </Text>
                {categoryMatch.confidence === 'fallback' && (
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B6B20' }}>
                    <Text style={{ color: '#FF6B6B' }} className="text-xs font-medium">Fallback</Text>
                  </View>
                )}
                {categoryMatch.confidence === 'partial' && (
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFA50020' }}>
                    <Text style={{ color: '#FFA500' }} className="text-xs font-medium">Partial</Text>
                  </View>
                )}
              </View>
            </View>
            {categoryMatch.confidence !== 'exact' && categoryMatch.aiRaw && (
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: colors.textMuted }} className="text-xs">AI parsed</Text>
                <Text style={{ color: colors.textMuted }} className="text-xs italic">
                  "{categoryMatch.aiRaw}"
                </Text>
              </View>
            )}
            {parsedTx.description && (
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: colors.textSecondary }} className="text-sm">Description</Text>
                <Text style={{ color: colors.text }} className="text-base" numberOfLines={2}>
                  {parsedTx.description}
                </Text>
              </View>
            )}
            <View className="flex-row items-center justify-between mb-2">
              <Text style={{ color: colors.textSecondary }} className="text-sm">Date</Text>
              <Text style={{ color: colors.text }} className="text-base">{parsedTx.date}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colors.textSecondary }} className="text-sm">Account</Text>
              <Text style={{ color: colors.text }} className="text-base">
                {defaultAccount?.name ?? 'Default'}
              </Text>
            </View>

            {txSaved && (
              <View className="mt-4 py-2 rounded-xl items-center" style={{ backgroundColor: '#05DF7220' }}>
                <Text className="text-secondary font-semibold text-sm">Transaction Saved!</Text>
              </View>
            )}
          </View>
        )}

        {/* Parsing indicator */}
        {screenState === 'parsing' && (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={{ color: colors.textMuted }} className="mt-3 text-sm">
              Parsing with AI...
            </Text>
          </View>
        )}

        {/* Transcript text */}
        {screenState !== 'parsing' && transcript ? (
          <View>
            {screenState === 'parsed' && (
              <View className="h-px mb-4" style={{ backgroundColor: colors.surfaceHover }} />
            )}
            <Text style={{ color: screenState === 'parsed' ? colors.textMuted : colors.text }} className="text-base leading-6">
              {screenState === 'parsed' && (
                <Text style={{ color: colors.textSecondary }} className="text-xs font-bold">
                  {'TRANSCRIPT\n'}
                </Text>
              )}
              {transcript}
            </Text>
          </View>
        ) : (
          screenState !== 'parsing' &&
          screenState !== 'parsed' && (
            <Text style={{ color: colors.textMuted }} className="text-base text-center mt-8">
              {screenState === 'recording' ? 'Listening...' : 'Tap the mic to start speaking'}
            </Text>
          )
        )}
      </ScrollView>

      {/* Controls */}
      <View className="items-center px-6" style={{ paddingBottom: insets.bottom + 16 }}>
        {saved && (
          <Text className="text-secondary text-sm font-medium mb-3">
            Saved to voice log
          </Text>
        )}

        {/* Recording Controls */}
        {(screenState === 'ready' || screenState === 'recording') && (
          <View className="items-center">
            <Animated.View style={{ transform: [{ scale: screenState === 'recording' ? pulseAnim : 1 }] }}>
              <Pressable
                onPress={screenState === 'recording' ? handleStopRecording : handleStartRecording}
                className={`w-20 h-20 rounded-full items-center justify-center ${screenState === 'recording' ? 'bg-expense' : 'bg-primary'}`}
                style={{
                  shadowColor: screenState === 'recording' ? '#FF6B6B' : '#0084D1',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Ionicons
                  name={screenState === 'recording' ? 'stop' : 'mic'}
                  size={36}
                  color="#FFFFFF"
                />
              </Pressable>
            </Animated.View>
            {screenState === 'recording' && (
              <Text className="text-expense text-sm font-medium mt-3">Recording...</Text>
            )}
          </View>
        )}

        {/* Transcribed Controls */}
        {screenState === 'transcribed' && transcript.trim().length > 0 && (
          <View className="w-full gap-3">
            <View className="flex-row gap-3">
              {/* Parse Transaction */}
              <Pressable
                onPress={handleParseTransaction}
                className="flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 bg-primary"
              >
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text className="text-white font-semibold">
                  {llamaReady || aiServiceRef.current.isReady() ? 'Parse Transaction' : 'Quick Parse'}
                </Text>
              </Pressable>

              {/* Save Log */}
              <Pressable
                onPress={handleSaveLog}
                className="py-4 px-5 rounded-2xl items-center flex-row justify-center gap-2"
                style={{ backgroundColor: colors.surface }}
              >
                <Ionicons name="save-outline" size={18} color={colors.text} />
                <Text style={{ color: colors.text }} className="font-semibold">Log</Text>
              </Pressable>
            </View>

            {/* Re-record */}
            <Pressable
              onPress={handleReset}
              className="py-3 rounded-2xl items-center"
              style={{ backgroundColor: colors.surfaceHover }}
            >
              <Text style={{ color: colors.textSecondary }} className="font-medium">Re-record</Text>
            </Pressable>
          </View>
        )}

        {/* Parsed Controls */}
        {screenState === 'parsed' && parsedTx && !txSaved && (
          <View className="w-full gap-3">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleConfirmTransaction}
                className="flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 bg-secondary"
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold">Save Transaction</Text>
              </Pressable>
              <Pressable
                onPress={handleReset}
                className="py-4 px-5 rounded-2xl items-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Ionicons name="refresh" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* After tx saved */}
        {screenState === 'parsed' && txSaved && (
          <View className="w-full gap-3">
            <Pressable
              onPress={handleReset}
              className="py-4 rounded-2xl items-center bg-primary"
            >
              <Text className="text-white font-semibold">Record Another</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
