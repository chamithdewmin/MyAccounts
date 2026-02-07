import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Wallet, Receipt, FileText, BarChart3 } from 'lucide-react';
import logoIcon from '@/assets/icon.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const result = login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - MyAccounts</title>
        <meta name="description" content="Login to MyAccounts accounting management system" />
      </Helmet>

      <div className="min-h-screen flex">
        {/* Left Panel - Promotional */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 bg-[#0f172a] relative overflow-hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%231e293b' fill-opacity='0.4' d='M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,149.3C960,160,1056,160,1152,138.7C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: 'cover',
            backgroundPosition: 'bottom',
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-lg"
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-2">
              Manage Your Finances
            </h1>
            <p className="text-xl text-white/90 mb-4">Quickly . Securely . Simply</p>
            <p className="text-white/80 text-base leading-relaxed mb-12">
              Join businesses who use MyAccounts to track income, expenses, invoices and reports – all in one place.
            </p>
            <p className="text-white font-semibold text-lg mb-6 text-center">One App for All Your Accounting</p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex flex-col items-center gap-2 text-white/90">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <span className="text-sm">Income</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-white/90">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <span className="text-sm">Expenses</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-white/90">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-sm">Invoices</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-white/90">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <span className="text-sm">Reports</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[#0f172a] lg:bg-[#1e293b]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl p-8 sm:p-10 border border-slate-700/50">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img
                  src={logoIcon}
                  alt="MyAccounts logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-white text-center mb-8">
                Login to your Account
              </h2>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 mb-6"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-400">{error}</span>
                </motion.div>
              )}

              {/* Login form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@yourbusiness.lk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <a href="#" className="text-sm text-blue-400 hover:text-blue-300">
                      Forgot Password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800/80 border-slate-600 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-lg"
                >
                  Sign in
                </Button>
              </form>

              <p className="text-center text-slate-400 mt-6">
                New to MyAccounts?{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign Up
                </a>
              </p>

              <p className="text-center text-slate-500 text-xs mt-8">
                Version: 1.0.0
              </p>
            </div>

            {/* Demo credentials - mobile */}
            <p className="text-center text-slate-500 text-sm mt-4">
              Demo: admin@gmail.com / admin123
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Login;
