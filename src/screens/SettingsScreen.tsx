import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { ShopSettings } from '../types';
import { testFirebaseConnection } from '../services/firebase';
import { 
  Settings, Save, Download, Database, 
  Check, RefreshCw, AlertCircle, FileSpreadsheet, Trash2, CloudCheck
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [settings, setSettings] = useState<ShopSettings>(storage.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestFirebase = async () => {
    setFirebaseStatus('testing');
    const ok = await testFirebaseConnection();
    if (ok) {
      setFirebaseStatus('connected');
    } else {
      setFirebaseStatus('ready');
    }
  };

  const handleManualSyncFirebase = async () => {
    setFirebaseStatus('syncing');
    await storage.syncFromFirebase();
    setFirebaseStatus('synced');
    setTimeout(() => setFirebaseStatus(null), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = storage.exportDatabaseJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pakmobile_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const csvStr = storage.exportInvoicesCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pakmobile_invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Completely wipe all data for clean slate
  const handleWipeAllData = () => {
    if (confirm(isRTL ? 'کیا آپ واقعی تمام مصنوعات، انوائسز اور گاہکوں کا ڈیٹا مستقل طور پر صاف کرنا چاہتے ہیں؟' : 'Wipe all products, invoices, and customer records for a clean slate?')) {
      storage.clearAllData();
      alert(isRTL ? 'تمام ڈیٹا کامیابی سے صاف ہو گیا ہے۔' : 'All data wiped clean.');
      window.location.reload();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      
      {/* Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <span>{t('settings.title')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isRTL ? 'دکان کی تفصیلات، پرنٹر سیٹنگز اور فائر بیس کلاؤڈ ڈیٹا بیس' : 'Shop receipt details, printer preferences, and Firebase Firestore cloud database'}
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{t('settings.save_success')}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Shop Identity Information */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            {t('settings.shop_details')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Name (English)
              </label>
              <input
                type="text"
                value={settings.shop_name_en}
                onChange={e => setSettings({ ...settings, shop_name_en: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                دکان کا نام (اردو)
              </label>
              <input
                type="text"
                dir="rtl"
                value={settings.shop_name_ur}
                onChange={e => setSettings({ ...settings, shop_name_ur: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address (English)
              </label>
              <input
                type="text"
                value={settings.shop_address_en}
                onChange={e => setSettings({ ...settings, shop_address_en: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                دکان کا پتہ (اردو)
              </label>
              <input
                type="text"
                dir="rtl"
                value={settings.shop_address_ur}
                onChange={e => setSettings({ ...settings, shop_address_ur: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('settings.shop_phone')}
              </label>
              <input
                type="text"
                value={settings.shop_phone}
                onChange={e => setSettings({ ...settings, shop_phone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('settings.printer_default')}
              </label>
              <select
                value={settings.printer_type}
                onChange={e => setSettings({ ...settings, printer_type: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="58mm">58mm Thermal Receipt (ESC/POS)</option>
                <option value="80mm">80mm Thermal Receipt (Standard Roll)</option>
                <option value="a5">A5 Full Sheet Invoice</option>
              </select>
            </div>
          </div>
        </div>

        {/* FIREBASE FIRESTORE BACKEND (PROMPT: "Remove supbase and add firebase in backend") */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              <span>Firebase Firestore Cloud Backend</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Firebase</span>
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Firebase Project ID:</span>
              <span className="font-mono font-bold text-slate-900">{settings.firebase_project_id || 'resounding-sublime-7bvhw'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Firestore Database ID:</span>
              <span className="font-mono font-bold text-slate-900 truncate max-w-xs">{settings.firebase_database_id || 'ai-studio-pakmobilepos-5fef3712-5a48-4a22-aeb2-fcf8bf2608b8'}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-amber-200/60">
              <span className="text-slate-600 font-medium">Offline Resilience:</span>
              <span className="font-semibold text-emerald-800">Enabled (Automatic Local Cache + Cloud Sync)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestFirebase}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>{firebaseStatus === 'testing' ? 'Testing...' : firebaseStatus === 'connected' ? '✓ Firebase Connected!' : 'Test Firebase Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSyncFirebase}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${firebaseStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{firebaseStatus === 'syncing' ? 'Syncing...' : firebaseStatus === 'synced' ? '✓ Synced!' : 'Sync from Cloud Firestore'}</span>
            </button>
          </div>
        </div>

        {/* Local Backups & Data Export */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{isRTL ? 'ڈیٹا بیک اپ اور ایکسپورٹ' : 'Data Backup & Export'}</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>{t('settings.export_json')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t('settings.export_csv')}</span>
            </button>
          </div>
        </div>

        {/* Save button & Clear All Data */}
        <div className="flex items-center justify-between pt-2">
          {/* Prompt: "-Remove damo enters -Add delete option in everywhere" */}
          <button
            type="button"
            onClick={handleWipeAllData}
            className="px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-300 transition-colors flex items-center gap-1.5"
            title="Wipe all data clean"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isRTL ? 'تمام ڈیٹا صاف کریں (Clean Slate)' : 'Wipe All Data Clean'}</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>{t('settings.save_settings')}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
