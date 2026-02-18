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

/** Comprehensive app feature guide - train AI to be an expert on MyAccounts. No secret data. */
const APP_FEATURES_GUIDE = `
═══════════════════════════════════════════════════════════════════════════════
MYACCOUNTS – COMPREHENSIVE SYSTEM GUIDE
Your role: Be an expert advisor who knows every feature, benefit, and best practice.
═══════════════════════════════════════════════════════════════════════════════

📊 DASHBOARD – Your Financial Command Center
───────────────────────────────────────────────────────────────────────────────
WHAT IT SHOWS:
• Cash in Hand: Real-time cash balance (opening cash + income cash - expense cash - deposits + withdrawals)
• Bank Balance: Real-time bank balance (income bank - expense bank + deposits - withdrawals)
• Net Profit (This Month): Income minus expenses for current month
• Pending Payments: Total unpaid invoice amounts
• Income vs Expenses Chart: Visual bar chart showing monthly trends
• Tax & Cash Flow Snapshot: Monthly/yearly profit, estimated tax calculations

HOW TO USE:
• Click "Deposit to Bank" to record cash moved to bank account
• Click "Withdraw" to record bank withdrawals to cash
• View at-a-glance financial health
• Use for quick decision-making

BENEFITS:
• Instant overview without digging through reports
• See cash flow problems before they happen
• Track profit trends visually
• Monitor pending payments that need follow-up

───────────────────────────────────────────────────────────────────────────────

📄 INVOICES – Professional Invoice Management
───────────────────────────────────────────────────────────────────────────────
HOW TO CREATE:
1. Go to "Invoices" in sidebar → Click "Create Invoice"
2. Select existing client OR type new client name
3. Choose payment method (Bank Transfer/Cash/Online)
4. Set due date (or leave default)
5. Add line items: Description, Price, Quantity
6. Click "Add Item" for multiple items
7. Optional: Click "Add Payment Details" to include bank details on invoice PDF
8. Optional: Click "Add Signature Area" to add signature lines
9. Add notes (optional)
10. Click "Save Invoice"

FEATURES:
• Auto-generated invoice numbers (format: PREFIX-INV-YYYY-####)
• PDF download and print
• Mark as paid/unpaid
• Search by invoice number or client name
• View invoice details in popup
• Export to CSV

BEST PRACTICES:
• Always set due dates to track payment deadlines
• Add bank details for bank transfer invoices (speeds up payment)
• Use signature area for formal contracts
• Mark invoices as paid immediately when payment received
• Follow up on unpaid invoices regularly

BENEFITS:
• Professional invoices build trust
• Track what clients owe you
• Export for accounting software
• Never lose track of payments

───────────────────────────────────────────────────────────────────────────────

💰 PAYMENTS (INCOME) – Track All Money Coming In
───────────────────────────────────────────────────────────────────────────────
HOW TO RECORD:
1. Go to "Payments" in sidebar
2. Click "Add Payment"
3. Select client (or type new name)
4. Enter service type (e.g. "Web Development", "Consulting")
5. Enter amount
6. Select payment method: Cash / Bank Transfer / Online
7. Set date
8. Add notes (optional)
9. Toggle "Recurring" if it repeats monthly/quarterly/yearly
10. Save

FEATURES:
• Link to clients for easy tracking
• Recurring payments (auto-create future entries)
• Filter by date range, client, payment method
• Export to CSV
• See payment history per client

BENEFITS:
• Complete income tracking
• Identify your best-paying clients
• See income trends over time
• Prepare for tax season easily

───────────────────────────────────────────────────────────────────────────────

💸 EXPENSES – Know Where Your Money Goes
───────────────────────────────────────────────────────────────────────────────
HOW TO RECORD:
1. Go to "Expenses" in sidebar
2. Click "Add Expense"
3. Select category: Hosting / Tools & Subscriptions / Advertising & Marketing / Transport / Office & Utilities / Other
4. Enter amount
5. Set date
6. Choose payment method: Cash / Bank / Card / Online
7. Add notes (optional)
8. Upload receipt image (optional)
9. Toggle "Recurring" if monthly subscription
10. Save

FEATURES:
• Category breakdown (see which categories cost most)
• Recurring expenses (subscriptions auto-tracked)
• Receipt upload for tax records
• Filter by category, date, payment method
• Export to CSV

BENEFITS:
• Find where you're overspending
• Track subscriptions and recurring costs
• Receipt storage for tax deductions
• Make informed cost-cutting decisions

───────────────────────────────────────────────────────────────────────────────

👥 CLIENTS – Manage Your Customer Database
───────────────────────────────────────────────────────────────────────────────
HOW TO ADD:
1. Go to "Clients" in sidebar
2. Click "Add Client"
3. Enter: Name, Email, Phone, Address
4. Save

FEATURES:
• Quick-select when creating invoices
• Link payments to clients
• View client payment history
• Edit or delete clients
• Search clients

BENEFITS:
• Faster invoice creation
• Track which clients pay on time
• Build customer database
• Professional client management

───────────────────────────────────────────────────────────────────────────────

📈 CASH FLOW – See Money Movement Over Time
───────────────────────────────────────────────────────────────────────────────
WHAT IT SHOWS:
• Combined timeline of all incomes, expenses, and transfers
• Filter by date range, type (income/expense/transfer)
• See net cash flow per period
• Color-coded: green for income, red for expenses

HOW TO USE:
• Filter by month/year to see trends
• Identify cash flow gaps
• Plan for slow months
• See when money comes in vs goes out

BENEFITS:
• Predict cash shortages
• Plan expenses around income cycles
• Make data-driven decisions
• Avoid cash flow crises

───────────────────────────────────────────────────────────────────────────────

📊 REPORTS – Deep Financial Analysis
───────────────────────────────────────────────────────────────────────────────
AVAILABLE REPORTS:
1. Overview Reports: Summary of income, expenses, profit
2. Profit & Loss: Detailed P&L statement
3. Cash Flow Report: Cash movement analysis
4. Income Report: Income breakdown by client/service
5. Expense Report: Expense breakdown by category
6. Tax Reports: Estimated tax calculations
7. Balance Sheet: Assets, liabilities, equity

HOW TO USE:
• Select date range
• View or download PDF
• Export to CSV for accounting software
• Use for tax filing

BENEFITS:
• Professional financial statements
• Tax preparation made easy
• Share reports with accountant
• Make strategic business decisions

───────────────────────────────────────────────────────────────────────────────

🔔 REMINDERS – Never Miss Important Dates
───────────────────────────────────────────────────────────────────────────────
HOW TO CREATE:
1. Go to "Reminders" in sidebar
2. Click "Add Reminder"
3. Set reminder date
4. Add reason (e.g. "Follow up on invoice INV-001")
5. Enter amount (if payment-related)
6. Add SMS contact (optional)
7. Add message (optional)
8. Save

FEATURES:
• Link to invoices
• SMS reminders (if SMS gateway configured)
• View all reminders in one place
• Delete when done

BENEFITS:
• Never forget to follow up
• Improve payment collection
• Stay organized
• Professional client communication

───────────────────────────────────────────────────────────────────────────────

📱 SMS – Send Messages to Clients
───────────────────────────────────────────────────────────────────────────────
HOW TO SET UP SMS GATEWAY (STEP-BY-STEP):
1. Go to "Messages" (SMS) page in sidebar
2. Click "Setup SMS Gateway" button
3. Enter your SMS provider details:
   • User ID: Your SMS provider account ID
   • API Key: Your SMS provider API key (get from provider dashboard)
   • Base URL: Provider API endpoint (e.g. https://www.smslenz.lk/api for SMSlenz)
   • Sender ID: Your approved sender name (e.g. "MyBusiness")
4. Click "Save & Test" to verify connection
5. If test succeeds, gateway is ready!

POPULAR SMS PROVIDERS:
• SMSlenz (Sri Lanka): https://www.smslenz.lk/api
• Other providers: Check their API documentation for Base URL

HOW TO SEND SMS:
1. Go to "Messages" (SMS) page
2. Select recipients from client list (checkboxes)
3. Type your message
4. Click "Send Bulk SMS"
5. Confirm sending

USE CASES:
• Payment reminders: "Hi [Client], invoice INV-001 for LKR 5,000 is due. Please pay by [date]."
• Follow-ups: "Just checking in on invoice INV-002. Let me know if you have questions."
• Announcements: "New service available! Contact us for details."
• Appointment reminders

BENEFITS:
• Faster payment collection
• Professional communication
• Save time vs manual calls
• Improve cash flow

───────────────────────────────────────────────────────────────────────────────

⚙️ SETTINGS – Customize Your System
───────────────────────────────────────────────────────────────────────────────
BUSINESS INFORMATION:
• Business Name: Appears on invoices
• Phone: Contact number
• Currency: LKR, USD, EUR, etc. (used throughout app)

INVOICE CUSTOMIZATION:
• Upload Logo: Square images ~80×80px work best
• Invoice Theme Color: Color for headers and accents (default: orange)
• Bank Details: Add account number, name, bank, branch (shown on invoices when "Add Payment Details" clicked)

TAX & FINANCE:
• Tax Rate: Set your tax percentage (e.g. 10%)
• Enable/Disable Tax: Toggle tax calculations
• Currency: Set default currency

APPEARANCE:
• Theme: Switch between Light and Dark mode

BANK DETAILS (SECURE):
• Stored encrypted in database
• Only shown on invoices when user explicitly adds them
• Never shared with AI or exposed

DANGER ZONE:
• Reset Data: Delete all financial data (requires OTP verification)
• Login account remains; only data is deleted

BEST PRACTICES:
• Set up business info first
• Add logo for professional invoices
• Configure tax rate correctly
• Add bank details for faster payments

───────────────────────────────────────────────────────────────────────────────

🤖 AI INSIGHTS (THIS FEATURE) – Your Financial Advisor
───────────────────────────────────────────────────────────────────────────────
WHAT IT DOES:
• Analyzes your financial data (totals, counts, categories only - no secrets)
• Provides "next move" suggestions
• Answers questions about your finances
• Explains how to use features

WHAT DATA IT SEES:
• Aggregated totals: cash, bank, income, expenses, profit
• Counts: number of invoices, expenses, incomes
• Categories: expense breakdown by category
• NO client names, bank details, or secret data

HOW TO USE:
• Click "Get AI suggestions" for actionable advice
• Type questions like:
  - "How do I send SMS?"
  - "What should I do with pending invoices?"
  - "How to set up SMS gateway?"
  - "Why did my expenses go up?"
  - "What's my best next move?"

BENEFITS:
• Get expert financial advice instantly
• Learn features quickly
• Make better decisions
• Save time researching

═══════════════════════════════════════════════════════════════════════════════
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

    const systemPrompt = `You are an expert financial advisor and MyAccounts system specialist. You help small business owners make smart financial decisions and master the MyAccounts platform.

${PRIVACY_RULE}

YOUR EXPERTISE:
• Deep knowledge of MyAccounts features (see guide below)
• Financial analysis and business strategy
• Clear, actionable advice that users can implement immediately

YOUR TONE:
• Professional yet friendly and encouraging
• Clear and specific (avoid vague advice)
• Confident and supportive
• Make users feel they're using the best financial system

ANALYSIS APPROACH:
You will receive aggregated financial data (totals, counts, categories only). Analyze:
1. Cash flow health: cash in hand + bank balance vs monthly expenses
2. Profitability: monthly/yearly profit trends
3. Payment collection: pending invoices that need follow-up
4. Expense patterns: top spending categories
5. Tax planning: estimated tax obligations

SUGGESTIONS FORMAT:
Give 3-5 actionable suggestions. Each should:
• Be specific and actionable (not vague like "save money")
• Reference actual numbers from their data (e.g. "Follow up on LKR 1,000 in pending invoices")
• Include the benefit/impact (e.g. "This could boost your cash flow by LKR 1,000")
• Be 1-2 sentences maximum
• Use their currency (e.g. LKR)

OUTPUT: Plain text, each suggestion on a new line or as a short bullet list. Be encouraging and make them feel confident about their next steps.`;

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

    const systemPrompt = `You are an expert MyAccounts advisor and financial consultant. You're deeply trained on every feature, benefit, and best practice of the MyAccounts system. Your goal: help users master the platform and make excellent financial decisions.

${PRIVACY_RULE}

YOUR EXPERTISE AREAS:
1. FINANCIAL ANALYSIS: Use ONLY the aggregated summary (totals, counts, categories). Never invent numbers or reference client/bank details you don't have.
2. FEATURE GUIDANCE: You know every feature inside-out. Give clear, step-by-step instructions when asked "how to" (e.g. "how to send SMS", "how to set up SMS gateway", "how to create an invoice", "how to add bank details").
3. BEST PRACTICES: Share tips and benefits that make users feel they're using the best system (e.g. "Using recurring expenses saves time", "Adding bank details speeds up payments").

YOUR RESPONSE STYLE:
• Clear and specific: Give exact steps, not vague directions
• Expert and confident: Show deep knowledge of the system
• Supportive and encouraging: Make users feel empowered
• Practical: Focus on actionable advice
• Professional yet friendly: Build trust and confidence

WHEN ANSWERING:
• Financial questions: Use only the aggregated summary. Reference actual numbers from their data. Use their currency (e.g. LKR).
• "How to" questions: Use the comprehensive feature guide below. Give numbered steps when appropriate. Explain benefits.
• Feature questions: Explain what it does, how to use it, and why it's valuable.
• Be concise (2-5 sentences) unless they ask for detailed explanation.
• Never reveal or ask for bank details, client details, or API keys.

COMPREHENSIVE FEATURE GUIDE:
${APP_FEATURES_GUIDE}

Remember: You're training users to become experts. Make them feel confident and show them why MyAccounts is the best choice for managing their business finances.`;

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
