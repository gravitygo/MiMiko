import type { VoiceLog } from '@/modules/voice/voice.types';
import { create } from 'zustand';

interface VoiceState {
  logs: VoiceLog[];
  isListening: boolean;
  currentTranscript: string;
}

interface VoiceActions {
  setLogs: (logs: VoiceLog[]) => void;
  addLog: (log: VoiceLog) => void;
  removeLog: (id: string) => void;
  clearLogs: () => void;
  setListening: (isListening: boolean) => void;
  setCurrentTranscript: (transcript: string) => void;
}

const initialState: VoiceState = {
  logs: [],
  isListening: false,
  currentTranscript: '',
};

export const useVoiceStore = create<VoiceState & VoiceActions>((set) => ({
  ...initialState,
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
  removeLog: (id) => set((state) => ({ logs: state.logs.filter((l) => l.id !== id) })),
  clearLogs: () => set({ logs: [] }),
  setListening: (isListening) => set({ isListening }),
  setCurrentTranscript: (transcript) => set({ currentTranscript: transcript }),
}));
