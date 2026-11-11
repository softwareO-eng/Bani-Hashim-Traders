import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { User, UserRole } from '../types';
import { Store, Globe, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { t, isRTL, language, toggleLanguage } = useLanguage();
  const [phone, setPhone] = useState('03001234567');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const user = storage.loginWithPhonePin(phone, pin);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError(t('login.error_invalid'));
    }
  };

  const handleQuickDemoLogin = (demoPhone: string, demoPin: string) => {
    setPhone(demoPhone);
    setPin(demoPin);
    const user = storage.loginWithPhonePin(demoPhone, demoPin);
    if (user) {
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Language Switcher in corner */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 backdrop-blur-md transition-all active:scale-95"
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>{language === 'en' ? 'اردو' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 border border-slate-100">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRTL ? 'موبائل اسیسریز شاپ مینیجر • پاکستان' : 'Mobile Accessories Shop Management System'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium animate-in fade-in text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('login.phone_label')}
            </label>
            <div className="relative">
              <Phone className={`w-4 h-4 absolute top-3 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={t('login.phone_placeholder')}
                className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                  isRTL ? 'pr-9 pl-3 text-end' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('login.pin_label')}
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute top-3 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="password"
                maxLength={4}
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder={t('login.pin_placeholder')}
                className={`w-full py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                  isRTL ? 'pr-9 pl-3 text-end' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <span>{t('login.btn_login')}</span>
            <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </form>

        {/* Quick Demo Role Logins */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 text-center mb-2.5">
            {t('login.quick_demo')} (1-Click Test)
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('03001234567', '1234')}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-center transition-colors"
            >
              <div className="font-bold text-amber-900 text-xs">{t('roles.owner')}</div>
              <div className="text-[10px] text-amber-700 font-mono">PIN: 1234</div>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('03129876543', '2222')}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-center transition-colors"
            >
              <div className="font-bold text-emerald-900 text-xs">{t('roles.cashier')}</div>
              <div className="text-[10px] text-emerald-700 font-mono">PIN: 2222</div>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('03335554444', '3333')}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-center transition-colors"
            >
              <div className="font-bold text-blue-900 text-xs">{t('roles.stock_keeper')}</div>
              <div className="text-[10px] text-blue-700 font-mono">PIN: 3333</div>
            </button>
          </div>
        </div>

      </div>

      <div className="mt-4 text-center text-slate-500 text-xs">
        PakMobile POS v1.0 • Built with Free Stack (Vercel + Supabase)
      </div>
    </div>
  );
};
