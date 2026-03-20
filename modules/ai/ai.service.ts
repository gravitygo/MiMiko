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
  let categoryList: string;
  if (categories.length > 0) {
    const expenses = categories.filter(c => c.type === 'expense').map(c => c.name);
    const incomes = categories.filter(c => c.type === 'income').map(c => c.name);
    const parts: string[] = [];
    if (expenses.length > 0) parts.push(`Expense: ${expenses.join(', ')}`);
    if (incomes.length > 0) parts.push(`Income: ${incomes.join(', ')}`);
    categoryList = parts.join('\n');
  } else {
    categoryList = 'Expense: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other\nIncome: Salary, Freelance, Other';
  }

  const todayDate = new Date(today);
  const lastWeek = new Date(todayDate);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = `${lastWeek.getFullYear()}-${String(lastWeek.getMonth() + 1).padStart(2, '0')}-${String(lastWeek.getDate()).padStart(2, '0')}`;

  return `You are a financial transaction parser. Given a spoken description of an expense or income, extract the data and output ONLY valid JSON. No explanation. No markdown.
Today's date is ${today}.

Output format:
{"amount":number,"category":"string","description":"string","date":"YYYY-MM-DD"}

${categoryList}

Rules:
- You MUST pick one of the above categories exactly as written.
- If the context is about spending or paying, pick from Expense categories.
- If the context is about earning or receiving money, pick from Income categories.
- If none match well, pick the closest one.
- Compute relative dates: "today" = ${today}, "yesterday" = subtract 1 day, "last week" = subtract 7 days, etc.
- If no date mentioned, use today (${today}).
- If no description, set description to the full input text.

Examples:
Input: "Spent fifty dollars on groceries today"
Output: {"amount":50,"category":"Food","description":"groceries","date":"${today}"}

Input: "Paid 200 for electricity bill"
Output: {"amount":200,"category":"Bills","description":"electricity bill","date":"${today}"}

Input: "Got 1500 salary"
Output: {"amount":1500,"category":"Salary","description":"salary","date":"${today}"}

Input: "Uber ride last week for 2000 bucks"
Output: {"amount":2000,"category":"Transport","description":"Uber ride","date":"${lastWeekStr}"}`;
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
