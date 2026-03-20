import { createVoiceService } from '@/modules/voice/voice.service';
import type { CreateVoiceLogInput } from '@/modules/voice/voice.types';
import { useVoiceStore } from '@/state/voice.store';
import { useCallback } from 'react';

export function useVoice() {
  const fetch = useCallback(async (limit = 50) => {
    const { setLogs } = useVoiceStore.getState();
    try {
      const service = createVoiceService();
      const logs = await service.getLogs(limit);
      setLogs(logs);
      return logs;
    } catch {
      return [];
    }
  }, []);

  const addLog = useCallback(async (input: CreateVoiceLogInput) => {
    const { addLog: storeAddLog } = useVoiceStore.getState();
    try {
      const service = createVoiceService();
      const log = await service.addLog(input);
      storeAddLog(log);
      return log;
    } catch {
      return null;
    }
  }, []);

  const removeLog = useCallback(async (id: string) => {
    const { removeLog: storeRemoveLog } = useVoiceStore.getState();
    try {
      const service = createVoiceService();
      await service.removeLog(id);
      storeRemoveLog(id);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearAll = useCallback(async () => {
    const { clearLogs } = useVoiceStore.getState();
    try {
      const service = createVoiceService();
      await service.clearAll();
      clearLogs();
      return true;
    } catch {
      return false;
    }
  }, []);

  return { fetch, addLog, removeLog, clearAll };
}
