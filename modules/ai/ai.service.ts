import { getModelPath, isModelDownloaded } from '@/services/model-manager';
import type { LlamaContext } from 'llama.rn';
import { initLlama } from 'llama.rn';
import type { ParsedTransaction } from './ai.types';
import { fallbackParse, validateParsedTransaction } from './ai.validator';

let llamaContext: LlamaContext | null = null;

interface CategoryInfo {
  name: string;
  type: 'expense' | 'income';
}

function buildSystemPrompt(categories: CategoryInfo[], today: string): string {
  const todayDate = new Date(today);
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // Build simple category list
  let categoryList: string;
  if (categories.length > 0) {
    const expenses = categories.filter(c => c.type === 'expense').map(c => c.name);
    const incomes = categories.filter(c => c.type === 'income').map(c => c.name);
    const parts: string[] = [];
    if (expenses.length > 0) parts.push(`Expense: ${expenses.join(', ')}`);
    if (incomes.length > 0) parts.push(`Income: ${incomes.join(', ')}`);
    categoryList = parts.join('\n');
  } else {
    categoryList = `Expense: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other
Income: Salary, Freelance, Other`;
  }

  return `Parse transaction. Output JSON only.

{"amount":number,"category":"string","description":"string","date":"YYYY-MM-DD"}

Categories:
${categoryList}

Rules:
- Use exact category name from list
- today=${today}, yesterday=${yesterdayStr}
- If user says category name, use it exactly

Examples:
"Food 500" → {"amount":500,"category":"Food","description":"food","date":"${today}"}
"Transport 200 yesterday" → {"amount":200,"category":"Transport","description":"transport","date":"${yesterdayStr}"}
"Got salary 1500" → {"amount":1500,"category":"Salary","description":"salary","date":"${today}"}`;
}

function buildPrompt(transcript: string, today: string, categories: CategoryInfo[]): string {
  const systemPrompt = buildSystemPrompt(categories, today);
  return `<|system|>\n${systemPrompt}\n<|user|>\n${transcript}\n<|assistant|>\n`;
}

export function createAIService() {
  return {
    async init(onProgress?: (progress: number) => void): Promise<boolean> {
      if (llamaContext) return true;

      const downloaded = await isModelDownloaded('llama');
      if (!downloaded) return false;

      const modelPath = getModelPath('llama');
      llamaContext = await initLlama(
        {
          model: modelPath,
          n_ctx: 512,
          n_threads: 4,
          n_gpu_layers: 0,
        },
        onProgress,
      );
      return true;
    },

    isReady(): boolean {
      return llamaContext !== null;
    },

    async parseTranscript(transcript: string, categories?: CategoryInfo[]): Promise<ParsedTransaction | null> {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const cats = categories ?? [];

      if (!llamaContext) {
        return fallbackParse(transcript);
      }

      try {
        const prompt = buildPrompt(transcript, todayStr, cats);
        const result = await llamaContext.completion({
          prompt,
          n_predict: 256,
          temperature: 0.1,
          top_p: 0.9,
          stop: ['\n\n', '</s>', '<|user|>', '<|end|>'],
        });

        const text = (result.text || '').trim();
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
          return fallbackParse(transcript);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const validated = validateParsedTransaction(parsed);
        return validated ?? fallbackParse(transcript);
      } catch {
        return fallbackParse(transcript);
      }
    },

    async release(): Promise<void> {
      if (llamaContext) {
        await llamaContext.release();
        llamaContext = null;
      }
    },
  };
}

export type AIService = ReturnType<typeof createAIService>;
