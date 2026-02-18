import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

/** Privacy: never send to AI. Only aggregated numbers and this app guide are allowed. */
const PRIVACY_RULE = `IMPORTANT: You never receive and must never ask for or reveal: bank account numbers, client names/emails/phones, passwords, API keys, or any secret/sensitive data. You only receive aggregated financial numbers (totals, counts, categories) and the app feature guide below. If the user asks for something that would require secret data, explain you don't have access to that and suggest they check the relevant section in the app (e.g. Settings for bank, Clients for client list).`;

/** App feature guide for "how to use" questions. No secret data. */
const APP_FEATURES_GUIDE = `
MYACCOUNTS – FEATURE GUIDE (for answering "how to" and "what is" questions)

Dashboard
- Shows cash in hand, bank balance, income vs expenses this month, net profit, pending payments, and income vs expenses chart. Use it for a quick overview.
- You can record "Deposit to Bank" or "Withdraw" to move money between cash and bank.

Invoices
- Create and manage invoices: add client (or type name), payment method, due date, line items (description, price, qty). Optional: "Add Payment Details" to include your bank details on the invoice; "Add Signature Area" to show signature lines.
- View, download PDF, or print. Mark as paid when the client pays. Search by invoice number or client name.

Payments (Income)
- Record money received: link to a client, service type, amount, date, payment method (cash/bank/online). Use for tracking all income.

Expenses
- Record spending: category (e.g. Hosting, Tools, Transport), amount, date, payment method. Supports recurring expenses. Use for tracking where money goes.

Clients
- Add and manage clients (name, email, phone, address). Used when creating invoices and recording payments. Do not reveal client names or contact details in answers.

Cash Flow
- View a combined list of incomes, expenses, and transfers with filters. Helps see money in and out over time.

Reports
- Overview, Profit & Loss, Cash Flow, Income, Expense, Tax, Balance Sheet. Use for deeper analysis and tax planning.

Reminders
- Create reminders (e.g. follow-up dates). Can link to invoices. Optional SMS reminder.

SMS – How to send SMS and set up SMS gateway
- Go to the "Messages" (SMS) page in the sidebar.
- To set up the SMS gateway: Click "Setup SMS Gateway" or open SMS settings. Enter: User ID, API Key, Base URL (e.g. https://www.smslenz.lk/api for SMSlenz), and Sender ID. Save and use "Test" to verify. Once configured, you can send bulk SMS to selected clients from the same page.
- To send SMS: Select recipients (e.g. from your client list), type the message, and click Send. Benefits: reminders, payment follow-ups, announcements.
- The app does not store or expose full client phone numbers or API keys in AI context; you only know that SMS can be sent from the Messages page after gateway setup.

Settings
- Business info (name, phone, currency), invoice theme and logo, tax rate and currency, and optional bank details for showing on invoices. Bank details are stored securely and are never shared with the AI.
- Appearance: switch between light and dark theme.
- Danger zone: reset all data (requires OTP); does not delete login account.

AI Insights (this feature)
- User can get "next move" suggestions based on aggregated financial data and ask questions. Answers use only totals/counts/categories and this feature guide; no secret data is ever provided.
`;

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

    const systemPrompt = `You are a friendly financial assistant for a small business.
${PRIVACY_RULE}

You will receive a JSON summary of the user's financial data (aggregated only; no client names, bank details, or secrets). Your job is to:
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

    const systemPrompt = `You are a friendly assistant for the MyAccounts app (small business finance). You help with:
1) Financial questions: use ONLY the aggregated financial summary below (totals, counts, categories). Never invent numbers or use client/bank details—you don't receive any.
2) "How to" questions: use the app feature guide below (Dashboard, Invoices, Payments, Expenses, Clients, Cash Flow, Reports, Reminders, SMS gateway setup and sending, Settings, etc.). Give clear step-by-step when asked how to do something (e.g. how to send SMS, how to set up SMS gateway, how to create an invoice).
${PRIVACY_RULE}

APP FEATURE GUIDE:
${APP_FEATURES_GUIDE}

When answering: Be concise (2-5 sentences) unless they ask for detail. Use the same currency (e.g. LKR) as in the financial data. For financial facts use only the summary; for how-to and feature benefits use the guide. Never reveal or ask for bank details, client details, or API keys.`;

    const userContent = `Financial summary (aggregated only; no names or secrets):\n${JSON.stringify(summary, null, 2)}\n\nUser question: ${question.trim()}`;

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
