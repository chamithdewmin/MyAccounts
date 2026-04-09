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

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];

const ReportIncome = () => {
  const { incomes, settings, loadData } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);
  const [reportPreview, setReportPreview] = React.useState({ open: false, html: '', filename: '', title: '' });
  
  // Month/Year filter state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Filter data by selected month/year
  const filteredIncomes = useMemo(() => filterDataByMonth(incomes, selectedMonth, selectedYear), [incomes, selectedMonth, selectedYear]);

  const byClient = useMemo(() => {
    const map = {};
    filteredIncomes.forEach((i) => {
      const name = i.clientName || 'Unknown';
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredIncomes]);

  const byService = useMemo(() => {
    const map = {};
    filteredIncomes.forEach((i) => {
      const name = i.serviceType || 'Other';
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredIncomes]);
  
  const totalIncome = useMemo(() => filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0), [filteredIncomes]);

  const handleExport = (range) => {
    const filtered = filterByRange(incomes, range);
    const headers = ['Client', 'Service', 'Amount', 'Date'];
    const rows = filtered.map((i) => [
      i.clientName || 'Unknown',
      i.serviceType || '',
      i.amount,
      new Date(i.date).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Income report exported to CSV' });
  };

  const handlePDF = () => {
    const monthName = getMonthName(selectedMonth);
    const byClientData = byClient.reduce((acc, i) => { acc[i.name] = i.amount; return acc; }, {});
    const byServiceData = byService.reduce((acc, i) => { acc[i.name] = i.amount; return acc; }, {});

    let table = '<h1>Income Report</h1><p>Period: ' + monthName + ' ' + selectedYear + '</p>';
    table += '<p><strong>Total: ' + settings.currency + ' ' + totalIncome.toLocaleString() + '</strong></p>';
    
    // Detail table
    if (filteredIncomes.length > 0) {
      table += '<h3>Income Details</h3><table style="width:100%; border-collapse: collapse;"><tr style="background:#f5f5f5;"><th style="border:1px solid #ccc; padding:8px;">Date</th><th style="border:1px solid #ccc; padding:8px;">Client</th><th style="border:1px solid #ccc; padding:8px;">Service</th><th style="border:1px solid #ccc; padding:8px; text-align:right;">Amount</th></tr>';
      filteredIncomes.forEach((inc) => {
        table += `<tr><td style="border:1px solid #ccc; padding:8px;">${new Date(inc.date).toLocaleDateString()}</td><td style="border:1px solid #ccc; padding:8px;">${inc.clientName || '-'}</td><td style="border:1px solid #ccc; padding:8px;">${inc.serviceType || '-'}</td><td style="border:1px solid #ccc; padding:8px; text-align:right;">${settings.currency} ${(inc.amount || 0).toLocaleString()}</td></tr>`;
      });
      table += '</table>';
    }
    
    table += '<h3>By Client</h3><table style="width:100%; border-collapse: collapse;"><tr><th style="border:1px solid #ccc; padding:8px;">Client</th><th style="border:1px solid #ccc; padding:8px;">Amount</th></tr>';
    Object.entries(byClientData).forEach(([k, v]) => {
      table += `<tr><td style="border:1px solid #ccc; padding:8px;">${k}</td><td style="border:1px solid #ccc; padding:8px;">${settings.currency} ${v.toLocaleString()}</td></tr>`;
    });
    table += '</table><h3>By Service</h3><table style="width:100%; border-collapse: collapse;"><tr><th style="border:1px solid #ccc; padding:8px;">Service</th><th style="border:1px solid #ccc; padding:8px;">Amount</th></tr>';
    Object.entries(byServiceData).forEach(([k, v]) => {
      table += `<tr><td style="border:1px solid #ccc; padding:8px;">${k}</td><td style="border:1px solid #ccc; padding:8px;">${settings.currency} ${v.toLocaleString()}</td></tr>`;
    });
    table += '</table>';

    const fullHtml = getPrintHtml(table, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `income-report-${monthName}-${selectedYear}.pdf`, title: 'Income Report' });
  };

  return (
    <>
      <Helmet>
        <title>Income Reports - LogozoPOS</title>
        <meta name="description" content="Income by client, Income by service" />
      </Helmet>

      <div className="space-y-6" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div>
          <h1 className="text-3xl font-bold">Income Reports</h1>
          <p className="text-muted-foreground">Income by client, Income by service</p>
        </div>
        
        {/* Filter */}
        <div style={{ background: "#0a0a0a", borderRadius: 12, border: "1px solid #171717", padding: "16px 20px" }}>
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
        <div style={{ background: "#0a0a0a", borderRadius: 12, border: "1px solid #171717", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#8b9ab0", fontSize: 12, fontWeight: 600, textTransform: "uppercase", margin: 0 }}>Total Income</p>
            <p style={{ color: "#22c55e", fontSize: 28, fontWeight: 900, margin: "8px 0 0", fontFamily: "monospace" }}>{settings.currency} {totalIncome.toLocaleString()}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#8b9ab0", fontSize: 12, margin: 0 }}>{filteredIncomes.length} transactions</p>
            <p style={{ color: "#0e5cff", fontSize: 14, fontWeight: 600, margin: "4px 0 0" }}>{getMonthName(selectedMonth)} {selectedYear}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <h2 className="text-xl font-bold mb-4">Income by Client</h2>
            {byClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byClient} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                  <Bar dataKey="amount" name="Amount" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No income data</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-border"
          >
            <h2 className="text-xl font-bold mb-4">Income by Service</h2>
            {byService.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byService}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="amount"
                  >
                    {byService.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No income data</div>
            )}
          </motion.div>
        </div>
      </div>

      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} onExportCSV={handleExport} onDownloadPDF={handlePDF} reportTitle="Income" />
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))} html={reportPreview.html} filename={reportPreview.filename} reportTitle={reportPreview.title} />
    </>
  );
};

export default ReportIncome;
