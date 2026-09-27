"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Globe,
  TrainFront,
  BarChart3,
  ShieldCheck,
  Clock,
  User,
  Lock,
  EyeOff,
  Eye,
  Shield,
  Headset,
  Download
} from 'lucide-react';
import api from '../../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      if (savedPassword) {
        setPassword(savedPassword);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      // Save access token to a client cookie so Next.js middleware can read it for route protection
      if (response.data && response.data.accessToken) {
        document.cookie = `accessToken=${response.data.accessToken}; path=/; max-age=3600; SameSite=Lax`;
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Left Panel: Branding & Information */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden flex-col justify-between items-center text-white p-12">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image src="/loginscreenleftpicture.png" alt="Background" fill priority className="object-cover object-center" />
        </div>
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-950/60 via-slate-900/40 to-slate-900/50" />

        {/* Top spacer */}
        <div className="relative z-20 w-full" />

        {/* Center Content — NO logo here */}
        <div className="relative z-20 flex flex-col items-center text-center mt-12">
          <h1 className="text-6xl font-bold tracking-tight mb-4">RSMTS</h1>
          <p className="text-xl font-medium text-slate-200">
            Rolling Stock Movement &amp; Tracking System
          </p>
          <p className="text-lg text-slate-400 mt-2">
            Jamalpur Workshop (JMPW)
          </p>
        </div>

        {/* Bottom Content */}
        <div className="relative z-20 w-full max-w-2xl mt-auto">
          {/* Features Grid */}
          <div className="grid grid-cols-4 gap-6 mb-12 text-center border-t border-white/10 pt-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-3">
                <TrainFront size={24} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Track</h3>
              <p className="text-xs text-slate-400 mt-1">Real-time tracking of rolling stock</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-3">
                <BarChart3 size={24} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Manage</h3>
              <p className="text-xs text-slate-400 mt-1">Manage operations efficiently</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-3">
                <ShieldCheck size={24} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Secure</h3>
              <p className="text-xs text-slate-400 mt-1">Role-based access &amp; data security</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mb-3">
                <Clock size={24} className="text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm">Optimize</h3>
              <p className="text-xs text-slate-400 mt-1">Optimize workshop performance</p>
            </div>
          </div>

          <div className="flex items-end justify-between">
            {/* Secure Access Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 flex gap-4 max-w-sm">
              <div className="mt-1">
                <ShieldCheck className="text-blue-400" size={24} />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Secure Role-Based Access</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Access is granted based on your assigned role.
                  All activities are monitored and recorded.
                </p>
              </div>
            </div>

            {/* Copyright */}
            <div className="text-xs text-slate-500 pb-2">
              &copy; 2025 Indian Railways. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 relative bg-white">

        {/* Top Right Actions */}
        <div className="absolute top-8 right-8 flex items-center gap-3">
          {/* Download App */}
          <a
            href="https://rsmts.netlify.app/RSMTS_Jamalpur.apk"
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-2 px-3 py-1.5 border border-blue-200 bg-blue-50 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download App</span>
          </a>

          {/* Language Switcher */}
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Globe size={16} />
            <span className="hidden sm:inline">English</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>

        <div className="w-full max-w-md">
          {/* Header — logo shown ONLY here */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="mb-6 flex items-center justify-center">
              <Image src="/logo_bg_removed.png" alt="RSMTS Logo" width={64} height={64} className="object-contain" priority />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to RSMTS</h2>
            <div className="w-12 h-1 bg-blue-600 rounded-full mb-4"></div>
            <p className="text-slate-500">
              Sign in to access the <span className="font-semibold text-slate-700">RSMTS</span> Dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-slate-900"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-slate-900"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 pb-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                  Forgot Password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex justify-center items-center"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          {/* Footer help */}
          <div className="mt-12 flex flex-col items-center">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Headset size={16} />
              <span className="font-medium text-sm">Need help?</span>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Contact System Administrator or IT Support
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
