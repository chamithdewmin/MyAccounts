import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ExportReportDialog from '@/components/ExportReportDialog';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import { getPrintHtml } from '@/utils/pdfPrint';
import MonthYearFilter, { filterDataByMonth, getMonthName } from '@/components/MonthYearFilter';

const COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];

const ReportExpense = () => {
  const { expenses, settings, loadData } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);
  const [reportPreview, setReportPreview] = React.useState({ open: false, html: '', filename: '', title: '' });
  
  // Month/Year filter state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Filter data by selected month/year
  const filteredExpenses = useMemo(() => filterDataByMonth(expenses, selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear]);

  const byCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const handlePDF = () => {
    const monthName = getMonthName(selectedMonth);
    const byCat = byCategory.reduce((acc, e) => { acc[e.name] = e.amount; return acc; }, {});

    let table = '<h1>Expense Report</h1><p>Period: ' + monthName + ' ' + selectedYear + '</p>';
    table += '<p><strong>Total: ' + settings.currency + ' ' + totalExpenses.toLocaleString() + '</strong></p>';
    
    // Detail table
    if (filteredExpenses.length > 0) {
      table += '<h3>Expense Details</h3><table style="width:100%; border-collapse: collapse;"><tr style="background:#f5f5f5;"><th style="border:1px solid #1e1e1e; padding:8px;">Date</th><th style="border:1px solid #1e1e1e; padding:8px;">Category</th><th style="border:1px solid #1e1e1e; padding:8px;">Description</th><th style="border:1px solid #1e1e1e; padding:8px; text-align:right;">Amount</th></tr>';
      filteredExpenses.forEach((exp) => {
        table += `<tr><td style="border:1px solid #1e1e1e; padding:8px;">${new Date(exp.date).toLocaleDateString()}</td><td style="border:1px solid #1e1e1e; padding:8px;">${exp.category || '-'}</td><td style="border:1px solid #1e1e1e; padding:8px;">${exp.description || '-'}</td><td style="border:1px solid #1e1e1e; padding:8px; text-align:right;">${settings.currency} ${(exp.amount || 0).toLocaleString()}</td></tr>`;
      });
      table += '</table>';
    }
    
    table += '<h3>Expense Breakdown by Category</h3><table style="width:100%; border-collapse: collapse;"><tr><th style="border:1px solid #1e1e1e; padding:8px;">Category</th><th style="border:1px solid #1e1e1e; padding:8px;">Amount</th></tr>';
    Object.entries(byCat).forEach(([k, v]) => {
      table += `<tr><td style="border:1px solid #1e1e1e; padding:8px;">${k}</td><td style="border:1px solid #1e1e1e; padding:8px;">${settings.currency} ${v.toLocaleString()}</td></tr>`;
    });
    table += '</table>';

    const fullHtml = getPrintHtml(table, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `expense-report-${monthName}-${selectedYear}.pdf`, title: 'Expense Report' });
  };

  return (
    <>
      <Helmet>
        <title>Expense Reports - LogozoPOS</title>
        <meta name="description" content="Expense breakdown, Budget vs actual" />
      </Helmet>

      <div className="page-y" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expense Reports</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1 leading-relaxed">Expense breakdown, Budget vs actual</p>
        </div>
        
        {/* Filter */}
        <div style={{ background: "#0a0a0a", borderRadius: 12, border: "1px solid #1e1e1e", padding: "16px 20px" }}>
          <MonthYearFilter
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onDownload={handlePDF}
            autoDownload={true}
          />
        </div>
        
        {/* Summary */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: "#0a0a0a", borderRadius: 12, border: "1px solid #1e1e1e", padding: "20px" }}>
          <div>
            <p style={{ color: "#8b9ab0", fontSize: 12, fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Total Expenses</p>
            <p style={{ color: "#ef4444", fontSize: 28, fontWeight: 900, margin: "8px 0 0", fontFamily: "monospace" }}>{settings.currency} {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="text-left sm:text-right">
            <p style={{ color: "#8b9ab0", fontSize: 12, margin: 0 }}>{filteredExpenses.length} transactions</p>
            <p style={{ color: "#0e5cff", fontSize: 14, fontWeight: 600, margin: "4px 0 0" }}>{getMonthName(selectedMonth)} {selectedYear}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <h2 className="text-xl font-bold mb-4">Expense Breakdown by Category</h2>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="amount"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expense data for this period</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <h2 className="text-xl font-bold mb-4">Budget vs Actual</h2>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                  <Bar dataKey="amount" name="Actual" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expense data for this period</div>
            )}
            <p className="text-sm text-muted-foreground mt-2">Total actual: {settings.currency} {totalExpenses.toLocaleString()}</p>
          </motion.div>
        </div>
      </div>

      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))} html={reportPreview.html} filename={reportPreview.filename} reportTitle={reportPreview.title} />
    </>
  );
};

export default ReportExpense;
