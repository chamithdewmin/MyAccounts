import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import loginBackground from '@/assets/login-background.jpg';
import loginLogo from '@/assets/login logo.png';

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
        <meta name="description" content="Login to MyAccounts business management system" />
      </Helmet>

      <div
        className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBackground})` }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1A1A2E] rounded-3xl shadow-xl p-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <img src={loginLogo} alt="MyAccounts" className="h-10 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-[#D3D3D3] mb-8 text-center">Login to your Account</h2>

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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#D3D3D3]">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-[#26263B] border-[#3d4150] text-[#D3D3D3] placeholder:text-[#8a8d98] focus:ring-2 focus:ring-[#6A6FF7] focus:border-[#6A6FF7] rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[#D3D3D3]">Password</Label>
                  <a href="#" className="text-sm text-[#6A6FF7] hover:text-[#8b8ff9]">
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
                  className="h-12 bg-[#26263B] border-[#3d4150] text-[#D3D3D3] placeholder:text-[#8a8d98] focus:ring-2 focus:ring-[#6A6FF7] focus:border-[#6A6FF7] rounded-lg"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold rounded-lg transition-colors"
              >
                Sign in
              </Button>
            </form>

            <p className="text-center text-[#D3D3D3] mt-6 text-sm">
              New to MyAccounts?{' '}
              <a href="#" className="text-[#6A6FF7] hover:text-[#8b8ff9] font-medium">
                Sign Up
              </a>
            </p>

            <div className="text-center mt-8 pt-6">
              <p className="text-[#D3D3D3] text-xs">Version: 1.0.0</p>
            </div>
          </div>

          <p className="text-center text-[#D3D3D3]/80 text-sm mt-4">
            Demo: admin@gmail.com / admin123
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Login;
