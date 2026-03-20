import type { ParsedTransaction } from './ai.types';

const AMOUNT_REGEX = /\$?\d[\d,]*\.?\d*/;
const DATE_ISO_REGEX = /\d{4}-\d{2}-\d{2}/;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function validateParsedTransaction(
  raw: unknown,
): ParsedTransaction | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  const amount = typeof obj.amount === 'number' ? obj.amount : parseFloat(String(obj.amount));
  if (isNaN(amount) || amount <= 0) return null;

  const category = typeof obj.category === 'string' ? obj.category.trim() : '';
  if (!category) return null;

  const date =
    typeof obj.date === 'string' && DATE_ISO_REGEX.test(obj.date)
      ? obj.date
      : todayISO();

  const description =
    typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim()
      : undefined;

  return { amount, category, description, date };
}

export function fallbackParse(transcript: string): ParsedTransaction | null {
  const match = transcript.match(AMOUNT_REGEX);
  if (!match) return null;

  const amount = parseFloat(match[0].replace(/[$,]/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  return {
    amount,
    category: 'Other',
    description: transcript.trim(),
    date: todayISO(),
  };
}
