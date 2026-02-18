import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

/**
 * Build a financial summary for the current user from the database (no PII).
 */
async function getFinancialSummary(uid) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const isSameMonth = (d) => {
    const date = new Date(d);
    return date.getFullYear() === thisYear && date.getMonth() === thisMonth;
  };
  const isSameYear = (d) => new Date(d).getFullYear() === thisYear;

  const [
    incomesRows,
    expensesRows,
    invoicesRows,
    transfersRows,
    settingsRows,
  ] = await Promise.all([
    pool.query('SELECT amount, date, payment_method FROM incomes WHERE user_id = $1', [uid]),
    pool.query('SELECT amount, date, payment_method, category FROM expenses WHERE user_id = $1', [uid]),
    pool.query('SELECT total, status, subtotal, tax_amount FROM invoices WHERE user_id = $1', [uid]),
    pool.query('SELECT from_account, to_account, amount FROM transfers WHERE user_id = $1', [uid]),
    pool.query('SELECT opening_cash, tax_rate, tax_enabled FROM settings WHERE user_id = $1', [uid]),
  ]);

  const incomes = incomesRows.rows || [];
  const expenses = expensesRows.rows || [];
  const invoices = invoicesRows.rows || [];
  const transfers = transfersRows.rows || [];
  const settings = settingsRows.rows[0] || {};

  const openingCash = Number(settings.opening_cash) || 0;
  const taxRate = Number(settings.tax_rate) || 10;
  const taxEnabled = settings.tax_enabled !== false;

  const norm = (pm) => String(pm || '').toLowerCase().replace(/\s+/g, '_');
  const isCash = (pm) => !pm || norm(pm) === 'cash';
  const isBank = (pm) => ['bank', 'card', 'online', 'online_transfer', 'online_payment'].includes(norm(pm));

  const monthlyIncome = incomes.filter((i) => isSameMonth(i.date)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const yearlyIncome = incomes.filter((i) => isSameYear(i.date)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const monthlyExpenses = expenses.filter((e) => isSameMonth(e.date)).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const yearlyExpenses = expenses.filter((e) => isSameYear(e.date)).reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const incomeCash = incomes.filter((i) => isCash(i.payment_method)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const incomeBank = incomes.filter((i) => isBank(i.payment_method)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const expenseCash = expenses.filter((e) => isCash(e.payment_method)).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const expenseBank = expenses.filter((e) => isBank(e.payment_method)).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const cashToBank = transfers.filter((t) => t.from_account === 'cash' && t.to_account === 'bank').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const bankToCash = transfers.filter((t) => t.from_account === 'bank' && t.to_account === 'cash').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const cashInHand = openingCash + incomeCash - expenseCash - cashToBank + bankToCash;
  const bankBalance = incomeBank - expenseBank + cashToBank - bankToCash;
  const monthlyProfit = monthlyIncome - monthlyExpenses;
  const yearlyProfit = yearlyIncome - yearlyExpenses;
  const pendingPayments = invoices
    .filter((i) => String(i.status || '').toLowerCase() !== 'paid')
    .reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const estimatedTaxMonthly = taxEnabled && monthlyProfit > 0 ? (monthlyProfit * taxRate) / 100 : 0;
  const estimatedTaxYearly = taxEnabled && yearlyProfit > 0 ? (yearlyProfit * taxRate) / 100 : 0;

  const expenseByCategory = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + parseFloat(e.amount || 0);
  });

  return {
    currency: 'LKR',
    cashInHand,
    bankBalance,
    totalLiquid: cashInHand + bankBalance,
    monthlyIncome,
    yearlyIncome,
    monthlyExpenses,
    yearlyExpenses,
    monthlyProfit,
    yearlyProfit,
    pendingPayments,
    estimatedTaxMonthly,
    estimatedTaxYearly,
    numberOfIncomes: incomes.length,
    numberOfExpenses: expenses.length,
    unpaidInvoicesCount: invoices.filter((i) => String(i.status || '').toLowerCase() !== 'paid').length,
    expenseBreakdown: expenseByCategory,
  };
}

async function callAI(messages) {
  const useGroq = !!GROQ_API_KEY;
  const apiKey = useGroq ? GROQ_API_KEY : OPENAI_API_KEY;
  const baseUrl = useGroq ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
  const model = useGroq ? GROQ_MODEL : AI_MODEL;

  if (!apiKey) {
    return {
      error:
        'No AI API key set. Add GROQ_API_KEY (or OPENAI_API_KEY) in backend .env and restart the server. Get a free key at https://console.groq.com',
    };
  }

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.6,
      }),
    });
  } catch (err) {
    console.error('[AI] Network error:', err.message);
    return { error: `Network error: ${err.message}. Check if the server can reach the internet.` };
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error?.message || data.message || data.error || `HTTP ${res.status}`;
    console.error('[AI] API error:', res.status, msg);
    if (res.status === 401) {
      return { error: 'Invalid API key. Check GROQ_API_KEY in .env and that the key is active at https://console.groq.com' };
    }
    if (res.status === 404) {
      return { error: `Model "${model}" not found. Try GROQ_MODEL=llama-3.1-8b-instant in .env` };
    }
    return { error: typeof msg === 'string' ? msg : JSON.stringify(msg) };
  }

  if (data.error) {
    const msg = data.error.message || data.error.code || 'AI request failed';
    console.error('[AI] Provider error:', msg);
    return { error: msg };
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  return { text: text || 'No response from AI.' };
}

/**
 * POST /api/ai/suggestions
 * Returns AI-generated suggestions (next moves, insights) based on financial summary.
 */
router.post('/suggestions', async (req, res) => {
  try {
    const uid = req.user.id;
    const summary = await getFinancialSummary(uid);

    const systemPrompt = `You are a friendly financial assistant for a small business. You will receive a JSON summary of the user's financial data (no personal identifiers). Your job is to:
1. Analyze money in vs out, current cash and bank balance, profit, pending payments, and tax estimates.
2. Give 3-5 short, actionable suggestions: "What's my next move?" — e.g. follow up on pending invoices, reduce top expense category, set aside tax, build emergency buffer, etc.
Keep each suggestion to 1-2 sentences. Be encouraging and practical. Use the same currency (e.g. LKR) as in the data. Do not invent numbers; only refer to the data provided. Output in plain text, with each suggestion on a new line or as a short bullet list.`;

    const userContent = `Financial summary (JSON):\n${JSON.stringify(summary, null, 2)}\n\nBased on this, what are my best next moves?`;

    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ suggestions: result.text });
  } catch (err) {
    console.error('[AI suggestions]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * POST /api/ai/ask
 * Body: { question: string }
 * Answers the user's question using the financial summary as context.
 */
router.post('/ask', async (req, res) => {
  try {
    const uid = req.user.id;
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const summary = await getFinancialSummary(uid);

    const systemPrompt = `You are a friendly financial assistant for a small business. You have access to the following JSON summary of the user's financial data (no personal identifiers). Use only this data to answer. If the answer is not in the data, say so politely. Be concise (2-4 sentences unless they ask for detail). Use the same currency (e.g. LKR) as in the data. Do not invent numbers or names.`;

    const userContent = `Financial summary:\n${JSON.stringify(summary, null, 2)}\n\nUser question: ${question.trim()}`;

    const result = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ answer: result.text });
  } catch (err) {
    console.error('[AI ask]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/ai/summary
 * Returns the same financial summary used for AI (for display on the AI Insights page).
 */
router.get('/summary', async (req, res) => {
  try {
    const uid = req.user.id;
    const summary = await getFinancialSummary(uid);
    res.json(summary);
  } catch (err) {
    console.error('[AI summary]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
