import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { storage } from './services/storage';
import { User } from './types';
import { Header } from './components/Header';
import { LoginScreen } from './screens/LoginScreen';
import { PosScreen } from './screens/PosScreen';
import { InvoicesScreen } from './screens/InvoicesScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { StockMovesScreen } from './screens/StockMovesScreen';
import { StockCountScreen } from './screens/StockCountScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { 
  ShoppingCart, Receipt, Package, ArrowUpDown, 
  ClipboardCheck, Users, BarChart3, Settings as SettingsIcon, LogOut
} from 'lucide-react';

type ScreenId = 
  | 'pos' 
  | 'invoices' 
  | 'products' 
  | 'stock_moves' 
  | 'stock_count' 
  | 'customers' 
  | 'reports' 
  | 'settings';

const MainApp: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [activeScreen, setActiveScreen] = useState<ScreenId>('pos');
  const [, setRealtimeTick] = useState(0);

  // Real-time Firestore sync listener across all connected devices
  useEffect(() => {
    const unsub = storage.subscribeRealtime(() => {
      setRealtimeTick(prev => prev + 1);
    });
    return () => unsub();
  }, []);

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={user => setCurrentUser(user)} />;
  }

  // Navigation items tailored by user role
  const navItems = [
    { id: 'pos' as ScreenId, label: t('nav.pos'), icon: ShoppingCart, roles: ['owner', 'cashier'] },
    { id: 'invoices' as ScreenId, label: t('nav.invoices'), icon: Receipt, roles: ['owner', 'cashier'] },
    { id: 'products' as ScreenId, label: t('nav.products'), icon: Package, roles: ['owner', 'cashier', 'stock_keeper'] },
    { id: 'stock_moves' as ScreenId, label: t('nav.stock_moves'), icon: ArrowUpDown, roles: ['owner', 'stock_keeper'] },
    { id: 'stock_count' as ScreenId, label: t('nav.stock_count'), icon: ClipboardCheck, roles: ['owner', 'stock_keeper'] },
    { id: 'customers' as ScreenId, label: t('nav.customers'), icon: Users, roles: ['owner', 'cashier'] },
    { id: 'reports' as ScreenId, label: t('nav.reports'), icon: BarChart3, roles: ['owner', 'cashier'] },
    { id: 'settings' as ScreenId, label: t('nav.settings'), icon: SettingsIcon, roles: ['owner'] }
  ].filter(item => item.roles.includes(currentUser.role));

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'pos':
        return <PosScreen />;
      case 'invoices':
        return <InvoicesScreen />;
      case 'products':
        return <ProductsScreen currentUser={currentUser} />;
      case 'stock_moves':
        return <StockMovesScreen />;
      case 'stock_count':
        return <StockCountScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'reports':
        return <ReportsScreen currentUser={currentUser} />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <PosScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onUserChanged={u => setCurrentUser(u)}
        onOpenSettings={() => setActiveScreen('settings')}
        onNavigate={screen => setActiveScreen(screen as ScreenId)}
      />

      {/* Secondary Desktop / Tablet Tab Navigation */}
      <nav className="bg-white border-b border-slate-200 px-3 sm:px-6 hidden sm:block overflow-x-auto shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Screen Content Viewport */}
      <main className="flex-1 flex flex-col pb-16 sm:pb-0 overflow-y-auto">
        {renderActiveScreen()}
      </main>

      {/* Mobile Bottom Navigation Bar (Optimized for Android Phone usage in Pakistan) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-1.5 px-1 z-40 shadow-lg">
        {navItems.slice(0, 6).map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
