import React, { useMemo } from 'react';
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
import { getPrintHtml, downloadReportPdf } from '@/utils/pdfPrint';

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];

const ReportIncome = () => {
  const { incomes, settings } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);

  const byClient = useMemo(() => {
    const map = {};
    incomes.forEach((i) => {
      const name = i.clientName || 'Unknown';
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [incomes]);

  const byService = useMemo(() => {
    const map = {};
    incomes.forEach((i) => {
      const name = i.serviceType || 'Other';
      map[name] = (map[name] || 0) + i.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [incomes]);

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

  const handlePDF = async (range) => {
    const filtered = filterByRange(incomes, range);
    const total = filtered.reduce((s, i) => s + i.amount, 0);
    const byClientData = filtered.reduce((acc, i) => {
      const n = i.clientName || 'Unknown';
      acc[n] = (acc[n] || 0) + i.amount;
      return acc;
    }, {});
    const byServiceData = filtered.reduce((acc, i) => {
      const n = i.serviceType || 'Other';
      acc[n] = (acc[n] || 0) + i.amount;
      return acc;
    }, {});

    let table = '<h1>Income Report</h1><p>Period: ' + range.start.toLocaleDateString() + ' - ' + range.end.toLocaleDateString() + '</p>';
    table += '<p><strong>Total: ' + settings.currency + ' ' + total.toLocaleString() + '</strong></p>';
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
    await downloadReportPdf(fullHtml, `income-report-${range.start.toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'PDF downloaded', description: 'Income report saved to your device' });
  };

  return (
    <>
      <Helmet>
        <title>Income Reports - MyAccounts</title>
        <meta name="description" content="Income by client, Income by service" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Income Reports</h1>
            <p className="text-muted-foreground">Income by client, Income by service</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => toast({ title: 'Refreshed', description: 'Data refreshed' })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
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
            className="bg-card rounded-lg p-6 border border-secondary"
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
    </>
  );
};

export default ReportIncome;
