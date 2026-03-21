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
- `buildSystemPrompt(categories, today)`: creates minimal prompt optimized for TinyLlama
  - Simple category list (Expense/Income separated)
  - today/yesterday date handling
  - 3 concise few-shot examples
  - No hints or verbose rules (keeps token count low)

---

## Category Matching (app/voice.tsx)
- `categoryMatch`: matches AI output category name to user's categories
  - `confidence: 'exact'` - exact case-insensitive match
  - `confidence: 'partial'` - partial string match
  - `confidence: 'fallback'` - no match, uses first expense category
  - `aiRaw`: original AI-parsed category string
- UI shows confidence badges (Fallback/Partial) when not exact match
- Shows AI's raw parsed category when mismatch occurs

---

## Model
- Package: `llama.rn` (on-device GGUF inference)
- Model: `tinyllama-1.1b-chat.Q4_K_M.gguf` (~636MB, optional download)
- Context: 512 tokens, 4 threads, CPU-only (safe for all devices)
- Prompt: minimal system prompt (optimized for small model performance)
- Output: strict JSON `{amount, category, description, date}`
- Fallback: regex amount extraction when no model available

## Prompt Design (Optimized for TinyLlama)
- Minimal instructions to reduce token overhead
- Simple category list without keyword hints
- 3 examples covering expense, income, and date handling
- Rules: use exact category name, today/yesterday dates

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
- `isSetupComplete()`: checks if first-open setup has been completed (file flag)
- `markSetupComplete()`: marks setup as done (writes flag file)

## App Boot Flow (app/_layout.tsx)
- Phase 1: DB init + check setup flag
- If first open → onboarding screen: permissions + model downloads
- If returning user → silent model re-download if missing, then go to app
- Voice screen keeps own fallback setup if user skipped onboarding downloads
