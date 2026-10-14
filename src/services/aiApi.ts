import { TransactionItem } from './googleSheets';

export interface ParseResponse {
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'Despesa' | 'Receita';
    category: string;
    payment_method: string;
    notes: string;
  }>;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  raw_extracted_text?: string;
}

export interface FinancialContextPayload {
  spreadsheetTitle?: string;
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  categoriesSummary: Array<{ category: string; total: number; count: number }>;
  recentTransactions: Array<{
    date: string;
    description: string;
    category: string;
    type: string;
    amount: number;
    payment_method?: string;
  }>;
  currentMonthName?: string;
}

export async function parseFinancialWithAI(payload: {
  type: 'text' | 'image' | 'audio';
  content?: string;
  dataBase64?: string;
  mimeType?: string;
  currentDate?: string;
}): Promise<ParseResponse> {
  const res = await fetch('/api/ai/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao processar com a IA.');
  }

  return res.json();
}

export async function chatWithAdvisor(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  financialContext: FinancialContextPayload
): Promise<{ reply: string }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, financialContext }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro na resposta do assistente.');
  }

  return res.json();
}

export async function fetchFinancialInsights(
  financialContext: FinancialContextPayload
): Promise<{
  healthScore: number;
  healthStatus: string;
  summaryHighlight: string;
  insights: Array<{
    title: string;
    description: string;
    type: 'warning' | 'success' | 'tip' | 'info';
    category?: string;
  }>;
}> {
  const res = await fetch('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ financialContext }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao gerar insights.');
  }

  return res.json();
}
