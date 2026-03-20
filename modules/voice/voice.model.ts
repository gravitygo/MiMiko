import * as Crypto from 'expo-crypto';
import type { CreateVoiceLogInput, VoiceLog } from './voice.types';

export function createVoiceLog(input: CreateVoiceLogInput): VoiceLog {
  return {
    id: Crypto.randomUUID(),
    transcript: input.transcript,
    language: input.language,
    durationMs: input.durationMs,
    createdAt: new Date().toISOString(),
  };
}
