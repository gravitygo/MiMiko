export interface VoiceLog {
  id: string;
  transcript: string;
  language: string;
  durationMs: number;
  createdAt: string;
}

export interface VoiceLogRow {
  id: string;
  transcript: string;
  language: string;
  duration_ms: number;
  created_at: string;
}

export interface CreateVoiceLogInput {
  transcript: string;
  language: string;
  durationMs: number;
}
