import { getDatabase } from '@/database';
import { mapRowToVoiceLog } from './voice.mapper';
import type { VoiceLog, VoiceLogRow } from './voice.types';

export function createVoiceRepository() {
  return {
    async insert(log: VoiceLog): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO voice_logs (id, transcript, language, duration_ms, created_at) VALUES (?, ?, ?, ?, ?)`,
        [log.id, log.transcript, log.language, log.durationMs, log.createdAt]
      );
    },

    async findAll(limit = 50, offset = 0): Promise<VoiceLog[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<VoiceLogRow>(
        'SELECT * FROM voice_logs ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows.map(mapRowToVoiceLog);
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM voice_logs WHERE id = ?', [id]);
    },

    async deleteAll(): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM voice_logs');
    },

    async count(): Promise<number> {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM voice_logs'
      );
      return result?.count ?? 0;
    },
  };
}

export type VoiceRepository = ReturnType<typeof createVoiceRepository>;
