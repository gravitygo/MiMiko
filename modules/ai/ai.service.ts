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
  const lastWeek = new Date(todayDate);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0').replace(/\d+$/, String(todayDate.getDate() - 7).padStart(2, '0'))}`;
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
  const lastWeekActual = new Date(todayDate);
  lastWeekActual.setDate(lastWeekActual.getDate() - 7);
  const lastWeekActualStr = `${lastWeekActual.getFullYear()}-${String(lastWeekActual.getMonth() + 1).padStart(2, '0')}-${String(lastWeekActual.getDate()).padStart(2, '0')}`;

  // Build rich category descriptions with keyword hints
  const CATEGORY_HINTS: Record<string, string> = {
    Food: 'restaurant, lunch, dinner, breakfast, coffee, snack, eat out, dine, meal, fast food, cafe',
    Groceries: 'supermarket, grocery, market, ingredients, produce, household supplies',
    Transport: 'uber, lyft, taxi, gas, fuel, grab, bus, train, subway, parking, toll, ride',
    Shopping: 'clothes, electronics, amazon, online order, shoes, gadget, buy, purchase, mall',
    Entertainment: 'movie, netflix, spotify, game, concert, bar, club, fun, stream, ticket',
    Utilities: 'electricity, water, internet, wifi, phone bill, gas bill, electric bill, power',
    Health: 'doctor, medicine, pharmacy, hospital, gym, fitness, dental, medical, clinic, vitamin',
    Subscriptions: 'subscription, monthly plan, membership, premium, renew, annual plan',
    Investment: 'stocks, crypto, mutual fund, trading, invest, portfolio, bond',
    Savings: 'save, deposit, emergency fund, piggy bank, saving, set aside',
    Salary: 'salary, paycheck, wage, pay day, monthly pay, compensation',
    Freelance: 'freelance, gig, side hustle, contract work, project payment, client pay',
    Gifts: 'gift, present, birthday money, received gift, christmas money, bonus',
    Transfers: 'transfer, send money, received transfer, wire, remittance',
    Education: 'tuition, school, course, book, class, training, lesson, seminar',
    Bills: 'bill, payment, rent, insurance, credit card, loan, installment, due',
  };

  let categorySection: string;
  if (categories.length > 0) {
    const expenses = categories.filter(c => c.type === 'expense');
    const incomes = categories.filter(c => c.type === 'income');
    const parts: string[] = [];

    if (expenses.length > 0) {
      parts.push('EXPENSE CATEGORIES:');
      for (const cat of expenses) {
        const hints = CATEGORY_HINTS[cat.name];
        parts.push(hints ? `- "${cat.name}": ${hints}` : `- "${cat.name}"`);
      }
    }
    if (incomes.length > 0) {
      parts.push('INCOME CATEGORIES:');
      for (const cat of incomes) {
        const hints = CATEGORY_HINTS[cat.name];
        parts.push(hints ? `- "${cat.name}": ${hints}` : `- "${cat.name}"`);
      }
    }
    categorySection = parts.join('\n');
  } else {
    categorySection = `EXPENSE CATEGORIES:
- "Food": restaurant, lunch, dinner, breakfast, coffee, snack, eat out
- "Transport": uber, taxi, gas, fuel, bus, train, parking
- "Shopping": clothes, electronics, amazon, online order, mall
- "Bills": rent, insurance, credit card, loan, installment
- "Entertainment": movie, netflix, spotify, game, concert
- "Health": doctor, medicine, pharmacy, hospital, gym
- "Education": tuition, school, course, book, class
- "Other": anything else

INCOME CATEGORIES:
- "Salary": paycheck, wage, monthly pay
- "Freelance": gig, side hustle, contract work
- "Other": any other income`;
  }

  return `You are a financial transaction parser. Extract expense/income data from spoken text. Output ONLY valid JSON. No explanation. No markdown.

Today: ${today}

FORMAT: {"amount":number,"category":"string","description":"string","date":"YYYY-MM-DD"}

${categorySection}

CATEGORY RULES:
1. Pick the BEST matching category from the list above. Use the keyword hints to decide.
2. Spending/paying/buying → pick from EXPENSE categories.
3. Earning/receiving/getting paid → pick from INCOME categories.
4. Category name must EXACTLY match one listed above (case-sensitive).
5. If multiple could match, pick the most specific one (e.g. "groceries" → "Groceries" not "Food", "uber" → "Transport" not "Shopping").

DATE RULES:
- "today" = ${today}
- "yesterday" = ${yesterdayStr}
- "last week" / "a week ago" = ${lastWeekActualStr}
- No date mentioned = ${today}

DESCRIPTION: Short phrase describing what was bought/earned. If unclear, use the full input.

Examples:
Input: "Spent fifty dollars on groceries today"
Output: {"amount":50,"category":"Groceries","description":"groceries","date":"${today}"}

Input: "Paid 200 for electricity bill"
Output: {"amount":200,"category":"Utilities","description":"electricity bill","date":"${today}"}

Input: "Got 1500 salary"
Output: {"amount":1500,"category":"Salary","description":"salary","date":"${today}"}

Input: "Uber ride yesterday for 2000"
Output: {"amount":2000,"category":"Transport","description":"Uber ride","date":"${yesterdayStr}"}

Input: "Netflix subscription 15 dollars"
Output: {"amount":15,"category":"Subscriptions","description":"Netflix subscription","date":"${today}"}

Input: "Bought new shoes for 80"
Output: {"amount":80,"category":"Shopping","description":"new shoes","date":"${today}"}

Input: "Dinner with friends 45 dollars last week"
Output: {"amount":45,"category":"Food","description":"dinner with friends","date":"${lastWeekActualStr}"}`;
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
