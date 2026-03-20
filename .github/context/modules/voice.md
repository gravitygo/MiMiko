# Voice Module

On-device speech recognition → transcript logging.

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

---

## Speech Recognition
- Package: `expo-speech-recognition` (requires dev build)
- On-device: `requiresOnDeviceRecognition: true`
- Languages: en-US, fil-PH (English, Filipino/Tagalog)
- Continuous mode for longer dictation
- Graceful fallback when module not installed

## UI Flow
- Long press + button (floating tab bar) → `app/voice.tsx` modal
- Language selector (English/Filipino toggle pills)
- Large mic button: tap to start/stop
- Pulse animation while recording
- Save transcript → voice_logs DB table
- View logs in Settings → Voice Logs section
