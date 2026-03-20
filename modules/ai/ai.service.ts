import { getModelPath, isModelDownloaded } from '@/services/model-manager';
import type { LlamaContext } from 'llama.rn';
import { initLlama } from 'llama.rn';
import type { ParsedTransaction } from './ai.types';
import { fallbackParse, validateParsedTransaction } from './ai.validator';

let llamaContext: LlamaContext | null = null;

const SYSTEM_PROMPT = `You are a financial transaction parser. Given a spoken description of an expense or income, extract the data and output ONLY valid JSON. No explanation. No markdown.

Output format:
{"amount":number,"category":"string","description":"string","date":"YYYY-MM-DD"}

Categories: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Salary, Freelance, Other
If category is unclear, use "Other".
If no date mentioned, use today.
If no description, set description to the full input text.

Examples:
Input: "Spent fifty dollars on groceries today"
Output: {"amount":50,"category":"Food","description":"groceries","date":"TODAY"}

Input: "Paid 200 for electricity bill"
Output: {"amount":200,"category":"Bills","description":"electricity bill","date":"TODAY"}

Input: "Got 1500 salary"
Output: {"amount":1500,"category":"Salary","description":"salary","date":"TODAY"}`;

function buildPrompt(transcript: string, today: string): string {
  return `<|system|>\n${SYSTEM_PROMPT.replace(/TODAY/g, today)}\n<|user|>\n${transcript}\n<|assistant|>\n`;
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

    async parseTranscript(transcript: string): Promise<ParsedTransaction | null> {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      if (!llamaContext) {
        return fallbackParse(transcript);
      }

      try {
        const prompt = buildPrompt(transcript, todayStr);
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
