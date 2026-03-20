import { getModelPath, isModelDownloaded } from '@/services/model-manager';
import { Platform } from 'react-native';
import type { TranscribeRealtimeEvent, WhisperContext } from 'whisper.rn';
import { initWhisper } from 'whisper.rn';

let whisperContext: WhisperContext | null = null;
let realtimeStop: (() => Promise<void>) | null = null;

export function createWhisperService() {
  return {
    async init(): Promise<boolean> {
      if (whisperContext) return true;

      const downloaded = await isModelDownloaded('whisper');
      if (!downloaded) return false;

      const modelPath = getModelPath('whisper');
      whisperContext = await initWhisper({ filePath: modelPath });
      return true;
    },

    isReady(): boolean {
      return whisperContext !== null;
    },

    async startRealtime(
      language: string,
      onTranscript: (text: string, isFinal: boolean) => void,
      onError?: (error: string) => void,
    ): Promise<void> {
      if (!whisperContext) throw new Error('Whisper not initialized');

      const { stop, subscribe } = await whisperContext.transcribeRealtime({
        language,
        maxLen: 0,
        realtimeAudioSec: 60,
        realtimeAudioSliceSec: 25,
        ...(Platform.OS === 'ios'
          ? {
              audioSessionOnStartIos: {
                category: 'PlayAndRecord' as any,
                options: ['MixWithOthers' as any],
                mode: 'Default' as any,
              },
              audioSessionOnStopIos: 'restore',
            }
          : {}),
      });

      realtimeStop = stop;

      subscribe((event: TranscribeRealtimeEvent) => {
        if (event.error) {
          onError?.(event.error);
          return;
        }
        const text = event.data?.result ?? '';
        onTranscript(text, !event.isCapturing);
      });
    },

    async stop(): Promise<void> {
      if (realtimeStop) {
        await realtimeStop();
        realtimeStop = null;
      }
    },

    async release(): Promise<void> {
      await this.stop();
      if (whisperContext) {
        await whisperContext.release();
        whisperContext = null;
      }
    },
  };
}

export type WhisperService = ReturnType<typeof createWhisperService>;
