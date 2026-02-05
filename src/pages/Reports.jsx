import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getStorageData } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Reports = () => {
  const [salesByDay, setSalesByDay] = useState([]);
  const [revenueByMake, setRevenueByMake] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const orders = getStorageData('orders', []);

    // Sales by day (mock data for demo)
    const mockSalesByDay = [
      { date: '2024-01-01', sales: 45000 },
      { date: '2024-01-02', sales: 52000 },
      { date: '2024-01-03', sales: 38000 },
      { date: '2024-01-04', sales: 61000 },
      { date: '2024-01-05', sales: 48000 },
      { date: '2024-01-06', sales: 72000 },
      { date: '2024-01-07', sales: 55000 },
    ];
    setSalesByDay(mockSalesByDay);

    // Revenue by make
    const makeRevenue = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!makeRevenue[item.make]) {
          makeRevenue[item.make] = 0;
        }
        makeRevenue[item.make] += item.price * item.quantity;
      });
    });

    const revenueData = Object.entries(makeRevenue).map(([make, revenue]) => ({
      make,
      revenue
    }));
    setRevenueByMake(revenueData);
  }, []);

  const COLORS = ['#ff6a00', '#ff8533', '#ffa366', '#ffc199', '#ffd9cc'];

  const handleExport = () => {
    toast({
      title: "Export successful",
      description: "Report exported successfully",
    });
  };

  return (
    <>
      <Helmet>
        <title>Reports - AutoPOS</title>
        <meta name="description" content="View sales analytics and reports" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">View your sales performance</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Sales by Day</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                <XAxis dataKey="date" stroke="#bfc9d1" />
                <YAxis stroke="#bfc9d1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111316',
                    border: '1px solid #1f2933',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="#ff6a00" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Revenue by make */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Revenue by Make</h2>
            {revenueByMake.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByMake}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ make, percent }) => `${make} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {revenueByMake.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111316',
                      border: '1px solid #1f2933',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Reports;