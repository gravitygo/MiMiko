import type { VoiceLog, VoiceLogRow } from './voice.types';

export function mapRowToVoiceLog(row: VoiceLogRow): VoiceLog {
  return {
    id: row.id,
    transcript: row.transcript,
    language: row.language,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}
