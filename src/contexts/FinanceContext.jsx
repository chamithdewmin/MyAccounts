import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getStorageData, setStorageData } from '@/utils/storage';

const FinanceContext = createContext(null);

const STORAGE_KEYS = {
  incomes: 'finance_incomes',
  expenses: 'finance_expenses',
  clients: 'finance_clients',
  invoices: 'finance_invoices',
  settings: 'finance_settings',
};

const createId = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

const getDefaultSettings = () => ({
  businessName: 'My Business',
  currency: 'LKR',
  taxRate: 10,
  taxEnabled: true,
  theme: 'dark',
  logo: null, // data URL for logo image
  expenseCategories: [
    'Hosting',
    'Tools & Subscriptions',
    'Advertising & Marketing',
    'Transport',
    'Office & Utilities',
    'Other',
  ],
});

export const FinanceProvider = ({ children }) => {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(getDefaultSettings);

  // Load from storage on mount
  useEffect(() => {
    setIncomes(getStorageData(STORAGE_KEYS.incomes, []));
    setExpenses(getStorageData(STORAGE_KEYS.expenses, []));
    setClients(getStorageData(STORAGE_KEYS.clients, []));
    const storedSettings = getStorageData(STORAGE_KEYS.settings, null);
    setSettings(storedSettings ? { ...getDefaultSettings(), ...storedSettings } : getDefaultSettings());

    // Ensure invoices array exists in storage but don't crash if shape is different
    const storedInvoices = getStorageData(STORAGE_KEYS.invoices, []);
    if (Array.isArray(storedInvoices)) {
      setInvoices(storedInvoices);
    } else {
      setInvoices([]);
    }
  }, []);

  // Persist changes
  useEffect(() => {
    setStorageData(STORAGE_KEYS.incomes, incomes);
  }, [incomes]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.expenses, expenses);
  }, [expenses]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.clients, clients);
  }, [clients]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.invoices, invoices);
  }, [invoices]);

  useEffect(() => {
    setStorageData(STORAGE_KEYS.settings, settings);
  }, [settings]);

  const addClient = (data) => {
    const client = {
      id: createId('CL'),
      name: data.name.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      projects: data.projects || [],
      createdAt: data.createdAt || new Date().toISOString(),
    };
    setClients((prev) => [client, ...prev]);
    return client;
  };

  const addIncome = (data) => {
    const income = {
      id: createId('INC'),
      clientId: data.clientId || null,
      clientName: data.clientName?.trim() || '',
      serviceType: data.serviceType?.trim() || '',
      paymentMethod: data.paymentMethod || 'cash',
      amount: Number(data.amount) || 0,
      currency: settings.currency,
      date: data.date || new Date().toISOString(),
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      isRecurring: Boolean(data.isRecurringInflow),
      recurringFrequency: data.recurringFrequency || 'monthly',
      recurringEndDate: data.continueIndefinitely ? null : data.recurringEndDate || null,
      recurringNotes: data.recurringNotes || '',
    };
    setIncomes((prev) => [income, ...prev]);
    return income;
  };

  const addExpense = (data) => {
    const expense = {
      id: createId('EXP'),
      category: data.category || 'Other',
      amount: Number(data.amount) || 0,
      currency: settings.currency,
      date: data.date || new Date().toISOString(),
      notes: data.notes || '',
      isRecurring: Boolean(data.isRecurring),
      recurringFrequency: data.recurringFrequency || 'monthly',
      recurringEndDate: data.continueIndefinitely ? null : data.recurringEndDate || null,
      recurringNotes: data.recurringNotes || '',
      receipt: data.receipt || null, // { name, size, type, dataUrl }
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  };

  const addInvoice = (data) => {
    const invoiceNumber = data.invoiceNumber || createId('INV');
    const invoice = {
      id: invoiceNumber,
      invoiceNumber,
      clientId: data.clientId || null,
      clientName: data.clientName?.trim() || '',
      clientEmail: data.clientEmail?.trim() || '',
      clientPhone: data.clientPhone?.trim() || '',
      items: data.items || [],
      subtotal: Number(data.subtotal) || 0,
      taxRate: settings.taxEnabled ? settings.taxRate : 0,
      taxAmount: Number(data.taxAmount ?? (settings.taxEnabled ? (Number(data.subtotal) || 0) * (settings.taxRate / 100) : 0)),
      total: Number(data.total) || Number(data.subtotal) + Number(data.taxAmount ?? 0),
      paymentMethod: data.paymentMethod || 'bank',
      status: data.status || 'unpaid',
      dueDate: data.dueDate || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
      notes: data.notes || '',
    };
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  };

  const updateInvoiceStatus = (invoiceId, status) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId || inv.invoiceNumber === invoiceId ? { ...inv, status } : inv)),
    );
  };

  const updateIncome = (id, data) => {
    setIncomes((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              clientId: data.clientId ?? i.clientId,
              clientName: data.clientName ?? i.clientName,
              serviceType: data.serviceType ?? i.serviceType,
              paymentMethod: data.paymentMethod ?? i.paymentMethod,
              amount: Number(data.amount) ?? i.amount,
              date: data.date ?? i.date,
              notes: data.notes ?? i.notes,
              isRecurring: data.isRecurringInflow ?? i.isRecurring,
              recurringFrequency: data.recurringFrequency ?? i.recurringFrequency,
              recurringEndDate: data.continueIndefinitely ? null : (data.recurringEndDate ?? i.recurringEndDate),
              recurringNotes: data.recurringNotes ?? i.recurringNotes,
            }
          : i,
      ),
    );
  };

  const deleteIncome = (id) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const updateExpense = (id, data) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              category: data.category ?? e.category,
              amount: Number(data.amount) ?? e.amount,
              date: data.date ?? e.date,
              isRecurring: data.isRecurring ?? e.isRecurring,
              recurringFrequency: data.recurringFrequency ?? e.recurringFrequency,
              recurringEndDate: data.continueIndefinitely ? null : (data.recurringEndDate ?? e.recurringEndDate),
              recurringNotes: data.recurringNotes ?? e.recurringNotes,
              notes: data.notes ?? e.notes,
              receipt: data.receipt ?? e.receipt,
            }
          : e,
      ),
    );
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const updateClient = (id, data) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              name: data.name ?? c.name,
              email: data.email ?? c.email,
              phone: data.phone ?? c.phone,
              address: data.address ?? c.address,
            }
          : c,
      ),
    );
  };

  const deleteClient = (id) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteInvoice = (id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id && inv.invoiceNumber !== id));
  };

  const updateSettings = (partial) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  const totals = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const isSameMonth = (iso) => {
      const d = new Date(iso);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    };

    const isSameYear = (iso) => new Date(iso).getFullYear() === thisYear;

    const monthlyIncome = incomes.filter((i) => isSameMonth(i.date)).reduce((sum, i) => sum + i.amount, 0);
    const yearlyIncome = incomes.filter((i) => isSameYear(i.date)).reduce((sum, i) => sum + i.amount, 0);

    const monthlyExpenses = expenses.filter((e) => isSameMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const yearlyExpenses = expenses.filter((e) => isSameYear(e.date)).reduce((sum, e) => sum + e.amount, 0);

    const monthlyProfit = monthlyIncome - monthlyExpenses;
    const yearlyProfit = yearlyIncome - yearlyExpenses;

    const pendingPayments = invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

    const estimatedTaxMonthly =
      settings.taxEnabled && monthlyProfit > 0 ? (monthlyProfit * settings.taxRate) / 100 : 0;
    const estimatedTaxYearly =
      settings.taxEnabled && yearlyProfit > 0 ? (yearlyProfit * settings.taxRate) / 100 : 0;

    return {
      monthlyIncome,
      yearlyIncome,
      monthlyExpenses,
      yearlyExpenses,
      monthlyProfit,
      yearlyProfit,
      pendingPayments,
      estimatedTaxMonthly,
      estimatedTaxYearly,
    };
  }, [incomes, expenses, invoices, settings.taxEnabled, settings.taxRate]);

  const value = {
    incomes,
    expenses,
    clients,
    invoices,
    settings,
    addClient,
    addIncome,
    addExpense,
    addInvoice,
    updateIncome,
    deleteIncome,
    updateExpense,
    deleteExpense,
    updateClient,
    deleteClient,
    updateInvoiceStatus,
    deleteInvoice,
    updateSettings,
    totals,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return ctx;
};

