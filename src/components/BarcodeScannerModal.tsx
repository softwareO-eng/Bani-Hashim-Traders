import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Barcode, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const { isRTL } = useLanguage();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const qrCodeRegionId = 'html5qr-code-full-region';
    let isMounted = true;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrCodeRegionId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          aspectRatio: 1.333333
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              setScannedCode(decodedText);
              onScan(decodedText);
              stopScanner();
              setTimeout(() => {
                onClose();
              }, 400);
            }
          },
          () => {
            // scan failure callback (ignored for continuous scanning)
          }
        );
      } catch (err: any) {
        console.warn('Camera scan initialization failed (common in iframe/mock environment):', err);
        if (isMounted) {
          setErrorMessage(
            isRTL 
              ? 'کیمرہ شروع نہیں ہو سکا۔ آپ نیچے دیے گئے بارکوڈز میں سے کلک کر کے یا USB اسکینر سے ٹیسٹ کر سکتے ہیں۔'
              : 'Camera access unavailable or blocked in iframe. You can simulate scan or use a USB scanner.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
  };

  const handleSimulateScan = (code: string) => {
    setScannedCode(code);
    onScan(code);
    stopScanner();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {isRTL ? 'بارکوڈ اسکینر (کیمرہ / یو ایس بی)' : 'Barcode Scanner (Camera / USB)'}
            </h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="p-4">
          <div 
            id="html5qr-code-full-region" 
            className="w-full bg-slate-900 rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center relative text-white text-xs"
          >
            {scannedCode && (
              <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white z-10 animate-in fade-in">
                <CheckCircle2 className="w-12 h-12 mb-2 animate-bounce" />
                <span className="font-bold text-sm">Scanned: {scannedCode}</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Quick simulation buttons for testing */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
              <Barcode className="w-4 h-4 text-slate-500" />
              <span>{isRTL ? 'فوری ٹیسٹ بارکوڈز (کلک کریں):' : 'Click to Simulate Quick Barcode Scan:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleSimulateScan('8901001')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-start transition-colors"
              >
                <div className="font-medium text-slate-800">Samsung A15 Glass</div>
                <div className="font-mono text-slate-500 text-[10px]">8901001</div>
              </button>
              <button
                onClick={() => handleSimulateScan('8901003')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-start transition-colors"
              >
                <div className="font-medium text-slate-800">iPhone 15 Glass</div>
                <div className="font-mono text-slate-500 text-[10px]">8901003</div>
              </button>
              <button
                onClick={() => handleSimulateScan('8901009')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-start transition-colors"
              >
                <div className="font-medium text-slate-800">iPhone 15 Clear Case</div>
                <div className="font-mono text-slate-500 text-[10px]">8901009</div>
              </button>
              <button
                onClick={() => handleSimulateScan('8901016')}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-start transition-colors"
              >
                <div className="font-medium text-slate-800">20W Fast Charger</div>
                <div className="font-mono text-slate-500 text-[10px]">8901016</div>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
