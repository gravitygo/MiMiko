import { getModelPath, isModelDownloaded } from "@/services/model-manager";
import type { LlamaContext } from "llama.rn";
import { initLlama } from "llama.rn";
import type { ParsedTransaction } from "./ai.types";
import { fallbackParse, validateParsedTransaction } from "./ai.validator";

let llamaContext: LlamaContext | null = null;

interface CategoryInfo {
  name: string;
  type: "expense" | "income";
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateContext(): { today: string; yesterday: string } {
  const now = new Date();
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  return {
    today: formatDate(now),
    yesterday: formatDate(yesterdayDate),
  };
}

// ============================================================================
// CATEGORY KEYWORD MAPPING (weighted by specificity)
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    "lunch", "dinner", "breakfast", "coffee", "cafe", "restaurant",
    "grocery", "groceries", "pizza", "burger", "sushi", "noodle",
    "meal", "food", "eat", "snack", "takeout", "delivery",
    "ubereats", "grabfood", "foodpanda", "doordash",
    "bread", "milk", "fruit", "vegetable", "meat", "chicken",
    "beef", "pork", "fish", "rice", "drink", "juice", "tea",
  ],
  Transport: [
    "uber", "grab", "lyft", "bolt", "gojek", "taxi", "cab",
    "bus", "train", "metro", "subway", "mrt", "lrt",
    "gas", "petrol", "fuel", "parking", "toll",
    "fare", "ride", "commute", "transport", "car", "vehicle",
  ],
  Shopping: [
    "amazon", "shopee", "lazada", "ebay", "walmart", "target",
    "clothes", "clothing", "shoes", "bag", "watch",
    "electronics", "gadget", "phone", "laptop", "iphone",
    "shopping", "shop", "buy", "purchase", "mall", "store", "market",
  ],
  Bills: [
    "netflix", "spotify", "youtube", "disney", "hulu",
    "electric", "electricity", "water", "internet", "wifi",
    "rent", "mortgage", "insurance", "tax",
    "bill", "bills", "utility", "utilities", "subscription",
    "phone bill", "mobile", "fee", "payment",
  ],
  Entertainment: [
    "movie", "cinema", "theater", "concert", "show", "ticket",
    "game", "gaming", "steam", "playstation", "xbox", "nintendo",
    "gym", "fitness", "sport", "sports",
    "bar", "club", "party", "alcohol", "beer", "wine",
    "entertainment", "fun", "play", "event",
  ],
  Health: [
    "doctor", "hospital", "clinic", "pharmacy", "drugstore",
    "medicine", "medication", "drug", "pill", "vitamin", "supplement",
    "dental", "dentist", "checkup", "therapy", "therapist",
    "health", "medical",
  ],
  Education: [
    "udemy", "coursera", "skillshare", "masterclass",
    "school", "college", "university", "tuition",
    "book", "books", "textbook", "course", "class",
    "education", "learning", "study", "training", "lesson",
  ],
  Salary: [
    "salary", "wage", "paycheck", "payday", "income", "monthly pay",
  ],
  Freelance: [
    "freelance", "gig", "contract", "project payment", "client",
    "consulting", "side job", "sidejob", "commission",
  ],
};

function matchCategory(text: string, availableCategories: string[]): string | null {
  if (availableCategories.length === 0) return null;

  const lower = text.toLowerCase();
  const availableSet = new Set(availableCategories.map((c) => c.toLowerCase()));

  // Score each category based on keyword matches
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const categoryLower = category.toLowerCase();
    if (!availableSet.has(categoryLower)) continue;

    let score = 0;
    for (let i = 0; i < keywords.length; i++) {
      if (lower.includes(keywords[i])) {
        // Earlier keywords = higher specificity = higher score
        score += keywords.length - i;
      }
    }

    if (score > 0) {
      scores[category] = score;
    }
  }

  // Return highest scoring category
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;

  return availableCategories.find(
    (c) => c.toLowerCase() === best[0].toLowerCase(),
  ) ?? null;
}

function normalizeCategory(category: string, availableCategories: string[]): string {
  if (availableCategories.length === 0) return category;

  const match = availableCategories.find(
    (c) => c.toLowerCase() === category.toLowerCase(),
  );
  return match ?? category;
}

function isValidCategory(category: string, availableCategories: string[]): boolean {
  if (availableCategories.length === 0) return true;
  return availableCategories.some(
    (c) => c.toLowerCase() === category.toLowerCase(),
  );
}

// ============================================================================
// PROMPT BUILDER (optimized for small models)
// ============================================================================

function buildPrompt(
  transcript: string,
  categories: CategoryInfo[],
  today: string,
  yesterday: string,
): string {
  const expenseList = categories
    .filter((c) => c.type === "expense")
    .map((c) => c.name);
  const incomeList = categories
    .filter((c) => c.type === "income")
    .map((c) => c.name);

  const expenses = expenseList.length > 0
    ? expenseList.join(",")
    : "Food,Transport,Shopping,Bills,Entertainment,Health,Education";
  const income = incomeList.length > 0
    ? incomeList.join(",")
    : "Salary,Freelance";

  // Compact prompt optimized for small LLMs
  const system = `Parse expense to JSON. Output ONLY JSON.
{"amount":NUMBER,"category":"CAT","description":"DESC","date":"YYYY-MM-DD"}

Categories: ${expenses},${income}
Keywords: food/coffee/lunch→Food, uber/taxi/gas→Transport, amazon/shop→Shopping, netflix/rent/bill→Bills, movie/gym→Entertainment, doctor/medicine→Health, book/course→Education, salary/wage→Salary, freelance/gig→Freelance

CRITICAL: Pick BEST category. "Other" ONLY if nothing matches.
today=${today} yesterday=${yesterday}`;

  return `<|system|>\n${system}\n<|user|>\n${transcript}\n<|assistant|>\n`;
}

// ============================================================================
// JSON EXTRACTION (robust)
// ============================================================================

function extractJSON(text: string): Record<string, unknown> | null {
  const cleaned = text.trim();

  // Direct parse attempt
  try {
    const parsed = JSON.parse(cleaned);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    // Continue extraction
  }

  // Find JSON boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  const jsonStr = cleaned.slice(start, end + 1);

  // Handle common LLM malformations
  const fixed = jsonStr
    .replace(/,\s*}/g, "}") // trailing comma
    .replace(/'/g, '"') // single quotes
    .replace(/(\w+):/g, '"$1":') // unquoted keys
    .replace(/""/g, '"'); // double quotes

  try {
    const parsed = JSON.parse(fixed);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    // Try original
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (isPlainObject(parsed)) return parsed;
  } catch {
    return null;
  }

  return null;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

// ============================================================================
// FALLBACK PARSER (enhanced with category matching)
// ============================================================================

function enhancedFallback(
  transcript: string,
  categories: CategoryInfo[],
  today: string,
): ParsedTransaction {
  const base = fallbackParse(transcript);
  const categoryNames = categories.map((c) => c.name);

  // Try keyword matching
  const matched = matchCategory(transcript, categoryNames);

  if (base) {
    return {
      ...base,
      category: matched ?? base.category,
    };
  }

  // Ultimate fallback - always return valid transaction
  return {
    amount: 0,
    category: matched ?? "Other",
    description: transcript.trim(),
    date: today,
  };
}

// ============================================================================
// RESOLVE FINAL CATEGORY
// ============================================================================

function resolveCategory(
  llmCategory: string,
  transcript: string,
  description: string | undefined,
  categoryNames: string[],
): string {
  const isOther = llmCategory.toLowerCase() === "other";
  const isValid = isValidCategory(llmCategory, categoryNames);

  // If valid and not "Other", normalize and return
  if (isValid && !isOther) {
    return normalizeCategory(llmCategory, categoryNames);
  }

  // Try keyword matching as override
  const searchText = `${transcript} ${description ?? ""}`;
  const matched = matchCategory(searchText, categoryNames);

  if (matched) return matched;

  // If LLM category exists in available list, use it
  if (isValid) {
    return normalizeCategory(llmCategory, categoryNames);
  }

  // Last resort
  return categoryNames.length > 0 ? categoryNames[0] : "Other";
}

// ============================================================================
// AI SERVICE
// ============================================================================

export function createAIService() {
  return {
    async init(onProgress?: (progress: number) => void): Promise<boolean> {
      if (llamaContext) return true;

      if (!isModelDownloaded("llama")) return false;

      const modelPath = getModelPath("llama");
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

    async parseTranscript(
      transcript: string,
      categories?: CategoryInfo[],
    ): Promise<ParsedTransaction> {
      const { today, yesterday } = getDateContext();
      const cats = categories ?? [];
      const categoryNames = cats.map((c) => c.name);

      // No LLM - use deterministic fallback
      if (!llamaContext) {
        return enhancedFallback(transcript, cats, today);
      }

      try {
        const prompt = buildPrompt(transcript, cats, today, yesterday);

        const result = await llamaContext.completion({
          prompt,
          n_predict: 96,
          temperature: 0,
          top_p: 1,
          top_k: 1,
          stop: ["\n", "</s>", "<|user|>", "<|end|>", "<|"],
        });

        const text = (result.text ?? "").trim();
        const extracted = extractJSON(text);

        if (!extracted) {
          return enhancedFallback(transcript, cats, today);
        }

        const validated = validateParsedTransaction(extracted);

        if (!validated) {
          return enhancedFallback(transcript, cats, today);
        }

        // Resolve best category
        const finalCategory = resolveCategory(
          validated.category,
          transcript,
          validated.description,
          categoryNames,
        );

        return {
          ...validated,
          category: finalCategory,
        };
      } catch {
        return enhancedFallback(transcript, cats, today);
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
