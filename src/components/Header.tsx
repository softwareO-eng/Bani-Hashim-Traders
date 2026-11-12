import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { User, UserRole } from '../types';
import { 
  Globe, Wifi, WifiOff, Shield, UserCircle, LogOut, 
  Store, ChevronDown, Check, BarChart3, Users, Package, ArrowUpDown, ClipboardCheck
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onUserChanged: (user: User) => void;
  onOpenSettings: () => void;
  onNavigate?: (screen: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChanged,
  onOpenSettings,
  onNavigate
}) => {
  const { language, toggleLanguage, t, isRTL } = useLanguage();
  const settings = storage.getSettings();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSwitchRole = (targetRole: UserRole) => {
    const target = storage.getCurrentUser();
    const allUsers = storage.getCurrentUser(); // will look up in list
    const found = storage['db'].users.find((u: User) => u.role === targetRole);
    if (found) {
      storage.setCurrentUser(found);
      onUserChanged(found);
      setShowUserMenu(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          label: isRTL ? 'مالک (Owner)' : 'Owner'
        };
      case 'cashier':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          label: isRTL ? 'کیشیئر (POS)' : 'Cashier'
        };
      case 'stock_keeper':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          label: isRTL ? 'اسٹاک انچارج' : 'Stock Keeper'
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        
        {/* Shop Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {isRTL ? settings.shop_name_ur : settings.shop_name_en}
              </h1>
              {/* Online/Offline status pill */}
              <div 
                className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? t('app.online_badge') : t('app.offline_badge')}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {isRTL ? 'موبائل اسیسریز شاپ مینیجمنٹ سسٹم • پاکستان' : 'Mobile Accessories Shop POS'}
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Language Switcher Button (Instant Urdu / English toggle) */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all active:scale-95 shadow-2xs"
            title="Switch Language (Urdu / English)"
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span className={language === 'en' ? 'font-urdu font-bold text-sm' : 'font-sans'}>
              {language === 'en' ? 'اردو' : 'English'}
            </span>
          </button>

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.role === 'owner' ? 'O' : currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-start">
                <div className="font-semibold text-slate-800 leading-tight text-xs">
                  {currentUser.role === 'owner' ? t('roles.owner') : currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {roleInfo.label}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div 
                className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95`}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">{isRTL ? 'لاگ ان شدہ صارف:' : 'Signed in as:'}</p>
                  <p className="text-sm font-bold text-slate-900">
                    {currentUser.role === 'owner' ? t('roles.owner') : currentUser.name}
                  </p>
                  <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-semibold border ${roleInfo.bg}`}>
                    {roleInfo.label}
                  </span>
                </div>

                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isRTL ? 'کردار تبدیل کریں (ٹیسٹنگ کے لیے):' : 'Switch Role (Role Security Test):'}
                </div>

                <button
                  onClick={() => handleSwitchRole('owner')}
                  className="w-full px-3 py-2 text-start text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-800">{t('roles.owner')}</div>
                    <div className="text-[10px] text-slate-500">{t('roles.owner_desc')}</div>
                  </div>
                  {currentUser.role === 'owner' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  onClick={() => handleSwitchRole('cashier')}
                  className="w-full px-3 py-2 text-start text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-800">{t('roles.cashier')}</div>
                    <div className="text-[10px] text-slate-500">{t('roles.cashier_desc')}</div>
                  </div>
                  {currentUser.role === 'cashier' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  onClick={() => handleSwitchRole('stock_keeper')}
                  className="w-full px-3 py-2 text-start text-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-800">{t('roles.stock_keeper')}</div>
                    <div className="text-[10px] text-slate-500">{t('roles.stock_keeper_desc')}</div>
                  </div>
                  {currentUser.role === 'stock_keeper' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <div className="border-t border-slate-100 my-1"></div>
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isRTL ? 'تمام مینیو اور رپورٹس:' : 'All Screens & Reports:'}
                </div>

                {currentUser.role === 'owner' && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onNavigate) onNavigate('reports');
                    }}
                    className="w-full px-3 py-2 text-start text-xs text-emerald-700 font-bold hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>{isRTL ? 'نفع و نقصان اور خلاصہ (P&L Reports)' : 'Profit & Loss & Reports'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate('customers');
                  }}
                  className="w-full px-3 py-2 text-start text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>{t('nav.customers')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onNavigate) onNavigate('products');
                  }}
                  className="w-full px-3 py-2 text-start text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>{t('nav.products')}</span>
                </button>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full px-3 py-2 text-start text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>{t('nav.settings')}</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
