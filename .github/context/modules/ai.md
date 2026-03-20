# AI Module

Local LLM for parsing voice transcripts → structured transaction JSON.

---

## ai.types.ts
- `ParsedTransaction`: { amount, category, description?, date }

## ai.validator.ts
- `validateParsedTransaction(raw)`: validates unknown → ParsedTransaction | null
- `fallbackParse(transcript)`: regex-based amount extraction when LLM unavailable

## ai.service.ts
- `createAIService()`: factory for LLM-powered parsing
  - `init(onProgress?)`: load TinyLlama GGUF model
  - `isReady()`: check if llama context loaded
  - `parseTranscript(text, categories?)`: transcript → ParsedTransaction (llama if available, else fallback regex)
  - `release()`: free llama context
- `buildSystemPrompt()`: creates rich prompt with keyword hints per category (CATEGORY_HINTS map)
  - Separates expense vs income categories with context keywords
  - Includes 7 few-shot examples covering various scenarios
  - Better date handling (today, yesterday, last week)

---

## Model
- Package: `llama.rn` (on-device GGUF inference)
- Model: `tinyllama-1.1b-chat.Q4_K_M.gguf` (~636MB, optional download)
- Context: 512 tokens, 4 threads, CPU-only (safe for all devices)
- Prompt: system prompt with category list + few-shot examples
- Output: strict JSON `{amount, category, description, date}`
- Fallback: regex amount extraction when no model available

## Validation Rules
- amount must be > 0
- category must be non-empty string
- date must match YYYY-MM-DD or defaults to today
- description is optional

## Model Manager (services/model-manager.ts)
- `getModelPath(type)`: returns document directory path for model
- `isModelDownloaded(type)`: checks if file exists
- `downloadModel(type, onProgress)`: downloads from HuggingFace with progress
- `deleteModel(type)`: remove cached model
- `getModelStatus()`: summary of all models
