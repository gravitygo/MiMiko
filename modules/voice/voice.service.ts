import { createVoiceLog } from './voice.model';
import { createVoiceRepository } from './voice.repository';
import type { CreateVoiceLogInput, VoiceLog } from './voice.types';

export function createVoiceService() {
  const repository = createVoiceRepository();

  return {
    async addLog(input: CreateVoiceLogInput): Promise<VoiceLog> {
      const log = createVoiceLog(input);
      await repository.insert(log);
      return log;
    },

    async getLogs(limit = 50, offset = 0): Promise<VoiceLog[]> {
      return repository.findAll(limit, offset);
    },

    async removeLog(id: string): Promise<void> {
      await repository.delete(id);
    },

    async clearAll(): Promise<void> {
      await repository.deleteAll();
    },

    async count(): Promise<number> {
      return repository.count();
    },
  };
}

export type VoiceService = ReturnType<typeof createVoiceService>;
