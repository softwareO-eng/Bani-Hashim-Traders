import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { ShopSettings } from '../types';
import { 
  Settings, Save, Download, 
  Check, FileSpreadsheet, Trash2
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [settings, setSettings] = useState<ShopSettings>(storage.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    const unsub = storage.subscribeLocal(() => {
      if (!isDirtyRef.current) {
        setSettings(storage.getSettings());
      }
    });
    return () => unsub();
  }, []);

  const updateField = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    isDirtyRef.current = true;
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settings);
    isDirtyRef.current = false;
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
            {isRTL ? 'دکان کی تفصیلات، انوائس کی شرائط، پرنٹر سیٹنگز اور ڈیٹا بیک اپ' : 'Shop details, invoice policies, printer preferences, and data backup'}
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
                Shop Name (English) <span className="text-[10px] font-normal text-emerald-700">• Shown on Main Page & Invoices</span>
              </label>
              <input
                type="text"
                required
                value={settings.shop_name_en}
                onChange={e => updateField('shop_name_en', e.target.value)}
                placeholder="Enter your shop name"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                دکان کا نام (اردو) <span className="text-[10px] font-normal text-emerald-700">• مین پیج اور رسید پر نظر آئے گا</span>
              </label>
              <input
                type="text"
                dir="rtl"
                value={settings.shop_name_ur}
                onChange={e => updateField('shop_name_ur', e.target.value)}
                placeholder="دکان کا نام درج کریں"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address (English)
              </label>
              <input
                type="text"
                value={settings.shop_address_en}
                onChange={e => updateField('shop_address_en', e.target.value)}
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
                onChange={e => updateField('shop_address_ur', e.target.value)}
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
                onChange={e => updateField('shop_phone', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('settings.printer_default')}
              </label>
              <select
                value={settings.printer_type}
                onChange={e => updateField('printer_type', e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="58mm">58mm Thermal Receipt (ESC/POS)</option>
                <option value="80mm">80mm Thermal Receipt (Standard Roll)</option>
                <option value="a5">A5 Full Sheet Invoice</option>
              </select>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Invoice Terms (English)
              </label>
              <textarea
                rows={2}
                value={settings.custom_terms_en || ''}
                onChange={e => updateField('custom_terms_en', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                placeholder="e.g. Warranty/Returns policy"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                انوائس کی شرائط (اردو)
              </label>
              <textarea
                rows={2}
                dir="rtl"
                value={settings.custom_terms_ur || ''}
                onChange={e => updateField('custom_terms_ur', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                placeholder="مثلاً: واپسی کی پالیسی"
              />
            </div>
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
