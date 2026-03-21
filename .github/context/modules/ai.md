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
  - `parseTranscript(text, categories?)`: transcript → ParsedTransaction
  - `release()`: free llama context

### Helpers (internal)
- `getDateContext()`: returns { today, yesterday } as YYYY-MM-DD
- `buildPrompt(transcript, categories, today, yesterday)`: compact prompt for small LLMs
- `extractJSON(text)`: robust JSON extraction with malformation handling
- `matchCategory(text, availableCategories)`: weighted keyword-based category matching
- `resolveCategory(llmCategory, transcript, description, categoryNames)`: post-process LLM output
- `enhancedFallback(transcript, categories, today)`: deterministic fallback with keyword matching

### Category Matching System
- `CATEGORY_KEYWORDS`: mapping of categories → weighted keyword arrays
- Keywords ordered by specificity (earlier = higher score)
- Scoring: matches summed with positional weight
- Supports: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Salary, Freelance

### Generation Parameters (deterministic)
- `temperature: 0` - no randomness
- `top_k: 1, top_p: 1` - greedy decoding
- `n_predict: 96` - minimal token output
- `stop: ["\n", "</s>", "<|user|>", "<|end|>", "<|"]`

---

## Category Matching (app/voice.tsx)
- `categoryMatch`: matches AI output category name to user's categories
  - `confidence: 'exact'` - exact case-insensitive match
  - `confidence: 'partial'` - partial string match
  - `confidence: 'fallback'` - no match, uses first expense category
  - `aiRaw`: original AI-parsed category string
- UI shows confidence badges (Fallback/Partial) when not exact match

---

## Model
- Package: `llama.rn` (on-device GGUF inference)
- Model: `tinyllama-1.1b-chat.Q4_K_M.gguf` (~636MB, optional download)
- Context: 512 tokens, 4 threads, CPU-only
- Output: strict JSON `{amount, category, description, date}`
- Fallback: regex + keyword matching when no model available

## Prompt Design
- Compact system prompt optimized for small LLMs
- Explicit category list with keyword hints (food→Food, uber→Transport, etc.)
- Critical instruction: "Pick BEST category, Other ONLY if nothing matches"
- today/yesterday date context injected

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
- `isSetupComplete()`: checks if first-open setup has been completed
- `markSetupComplete()`: marks setup as done

## App Boot Flow (app/_layout.tsx)
- Phase 1: DB init + check setup flag
- If first open → onboarding screen: permissions + model downloads
- If returning user → silent model re-download if missing, then go to app
- Voice screen keeps own fallback setup if user skipped onboarding downloads
