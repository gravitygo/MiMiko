# Services

Shared services that don't belong to specific modules.

---

## model-manager.ts

Model download and management for on-device AI.

- `getModelPath(type)`: returns document directory path for model
- `isModelDownloaded(type)`: checks if file exists
- `downloadModel(type, onProgress)`: downloads from HuggingFace with progress
- `deleteModel(type)`: remove cached model
- `getModelStatus()`: summary of all models
- `isSetupComplete()`: checks if first-open setup completed
- `markSetupComplete()`: marks setup as done

Models:
- whisper: `ggml-small.en-q5_1.bin` (~181MB) - Speech-to-text
- llama: `tinyllama-1.1b-chat.Q4_K_M.gguf` (~636MB) - Transaction parsing

---

## backup.service.ts

Data backup and restore functionality.

- `createBackupService()`: factory function returning service instance

### Methods

- `backup()`: exports all data as JSON file via share sheet
  - Returns: `{ success: boolean; error?: string }`
  - Exports: categories, accounts, transactions, budgets, recurring_rules, debts

- `restore()`: imports backup from JSON file picker
  - Returns: `{ success: boolean; error?: string }`
  - Validates backup format before import
  - Replaces ALL existing data

- `getBackupInfo()`: returns counts of exportable data
  - Returns: `{ transactionCount, categoryCount, accountCount }`

### Backup Format (v1)

```json
{
  "version": 1,
  "createdAt": "ISO-8601",
  "data": {
    "categories": [...],
    "accounts": [...],
    "transactions": [...],
    "budgets": [...],
    "recurring_rules": [...],
    "debts": [...]
  }
}
```

### Dependencies
- expo-file-system/legacy (migrated from deprecated expo-file-system API)
- expo-sharing
- expo-document-picker

