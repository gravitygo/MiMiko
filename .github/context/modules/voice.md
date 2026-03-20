# Voice Module

On-device speech recognition (Whisper) → transcript logging + AI transaction parsing (LLM).

---

## voice.types.ts
- `VoiceLog`: id, transcript, language, durationMs, createdAt
- `VoiceLogRow`: DB row format
- `CreateVoiceLogInput`: transcript, language, durationMs

## voice.model.ts
- `createVoiceLog()`: creates VoiceLog with UUID + timestamp

## voice.mapper.ts
- `mapRowToVoiceLog()`: DB row → domain model

## voice.repository.ts
- `insert()`: save voice log
- `findAll()`: paginated fetch (desc by created_at)
- `delete()`: remove single log
- `deleteAll()`: clear all logs
- `count()`: total log count

## voice.service.ts
- `addLog()`: create + persist voice log
- `getLogs()`: paginated retrieval
- `removeLog()`: delete single
- `clearAll()`: wipe all logs
- `count()`: total count

## whisper.service.ts
- `createWhisperService()`: factory for on-device STT
  - `init()`: load whisper GGML model from disk
  - `isReady()`: check if context is loaded
  - `startRealtime(lang, onTranscript, onError)`: mic → real-time transcription
  - `stop()`: stop recording
  - `release()`: free whisper context

---

## Speech Recognition
- Package: `whisper.rn` (on-device Whisper model)
- Model: `ggml-tiny.bin` (~77MB, downloaded on first use)
- Languages: en, auto (whisper auto-detect)
- Uses `WhisperContext.transcribeRealtime()` for live mic → text
- Model stored at: `${documentDirectory}/models/ggml-tiny.bin`

## AI Pipeline
- Flow: Audio → Whisper STT → transcript → LLama parser → validated JSON → Transaction
- See: [AI Module](ai.md) for LLM parsing details

## UI Flow (app/voice.tsx)
- States: loading → setup → ready → recording → transcribed → parsing → parsed
- Setup screen: download whisper + optional llama models with progress
- Recording: whisper real-time transcription with pulse animation
- After recording: "Parse Transaction" (AI) or "Save Log" buttons
- Parsed: shows amount, category, description, date for confirmation
- Long press + button (floating tab bar) → voice modal

## UI Flow
- Long press + button (floating tab bar) → `app/voice.tsx` modal
- Language selector (English/Filipino toggle pills)
- Large mic button: tap to start/stop
- Pulse animation while recording
- Save transcript → voice_logs DB table
- View logs in Settings → Voice Logs section
