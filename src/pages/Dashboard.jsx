import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Users, DollarSign, Package, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStorageData } from '@/utils/storage';
import KpiCard from '@/components/KpiCard';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalOrders: 0,
  });

  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    const customers = getStorageData('customers', []);
    const cars = getStorageData('cars', []);
    const orders = getStorageData('orders', []);

    const revenue = orders.reduce((sum, order) => sum + order.total, 0);

    setStats({
      totalCustomers: customers.length,
      totalRevenue: revenue,
      totalProducts: cars.length,
      totalOrders: orders.length,
    });

    // Generate mock sales data
    const mockSalesData = [
      { name: 'Mon', sales: 12 },
      { name: 'Tue', sales: 19 },
      { name: 'Wed', sales: 15 },
      { name: 'Thu', sales: 25 },
      { name: 'Fri', sales: 22 },
      { name: 'Sat', sales: 30 },
      { name: 'Sun', sales: 18 },
    ];
    setSalesData(mockSalesData);
  }, []);

  return (
    <>
      <Helmet>
        <title>Dashboard - AutoPOS</title>
        <meta name="description" content="AutoPOS dashboard with sales analytics and key metrics" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={Users}
            trend={12.5}
            trendUp={true}
          />
          <KpiCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={8.2}
            trendUp={true}
          />
          <KpiCard
            title="Total Products"
            value={stats.totalProducts}
            icon={Package}
            trend={-2.4}
            trendUp={false}
          />
          <KpiCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingBag}
            trend={15.3}
            trendUp={true}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Sales Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                <XAxis dataKey="name" stroke="#bfc9d1" />
                <YAxis stroke="#bfc9d1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111316',
                    border: '1px solid #1f2933',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="sales" fill="#ff6a00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Customer Growth Map Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Customer Growth</h2>
            <div className="h-[300px] flex items-center justify-center bg-secondary rounded-lg">
              <p className="text-muted-foreground">Map visualization placeholder</p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;