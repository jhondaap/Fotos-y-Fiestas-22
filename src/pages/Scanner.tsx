import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, X, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function Scanner({ onScanSuccess }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning) {
      // Small delay to ensure the DOM element "reader" is mounted by React
      const timer = setTimeout(() => {
        const element = document.getElementById("reader");
        if (!element) return;

        scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 30, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            setLastResult(decodedText);
            setIsScanning(false);
            
            try {
              const context = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = context.createOscillator();
              const gain = context.createGain();
              osc.connect(gain);
              gain.connect(context.destination);
              osc.frequency.setValueAtTime(880, context.currentTime);
              gain.gain.setValueAtTime(0.1, context.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
              osc.start();
              osc.stop(context.currentTime + 0.1);
            } catch (e) {}

            scanner?.clear().catch(err => console.error("Error clearing scanner", err));
            
            setTimeout(() => {
              onScanSuccess(decodedText);
            }, 1000);
          },
          () => {}
        );
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(err => console.error("Error clearing scanner during cleanup", err));
        }
      };
    }
  }, [isScanning, onScanSuccess]);

  const stopScanning = () => {
    setIsScanning(false);
  };

  const [manualCode, setManualCode] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanSuccess(manualCode.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Escáner de Productos</h2>
        <p className="text-slate-400 text-sm font-medium">Escanea códigos o ingresa el número manualmente</p>
      </div>

      <div className="w-full aspect-square max-w-md bg-white rounded-[3rem] border border-gray-100 shadow-2xl relative overflow-hidden flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {!isScanning && !lastResult && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center space-y-6 w-full"
            >
              <div className="w-24 h-24 bg-brand-lime/10 rounded-full flex items-center justify-center text-brand-lime">
                <Camera size={48} />
              </div>
              <button
                onClick={() => setIsScanning(true)}
                className="bg-brand-forest hover:bg-[#1B3022]/90 text-white font-black py-5 px-10 rounded-3xl shadow-xl shadow-brand-forest/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center"
              >
                <Camera size={24} />
                Abrir Cámara
              </button>

              <div className="w-full relative py-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">o escribe el código</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <form onSubmit={handleManualSubmit} className="w-full flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Código de barras..."
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-lime transition-all"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="bg-brand-lime text-brand-forest font-black px-6 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all"
                >
                  Ir
                </button>
              </form>
            </motion.div>
          )}

          {isScanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-black flex flex-col"
            >
              <div id="reader" className="w-full flex-1" />
              <button
                onClick={stopScanning}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all z-20"
              >
                <X size={24} />
              </button>
              <div className="absolute bottom-8 left-0 right-0 text-center z-20">
                <p className="text-white font-bold text-xs uppercase tracking-widest bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-md">
                  Escaneando Código...
                </p>
              </div>
            </motion.div>
          )}

          {lastResult && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center space-y-6 text-center"
            >
              <div className="w-24 h-24 bg-brand-lime rounded-full flex items-center justify-center text-brand-forest shadow-xl shadow-brand-lime/30">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">¡Código Detectado!</h3>
                <p className="text-brand-forest font-bold font-mono mt-2 bg-brand-lime/20 px-4 py-1 rounded-full text-lg">
                  {lastResult}
                </p>
              </div>
              <p className="text-slate-400 text-xs font-medium animate-pulse">Redirigiendo a inventario...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-[10px] font-bold text-slate-500 leading-tight">
            Escanea cualquier formato estándar (EAN, UPC, QR)
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <AlertCircle size={16} />
          </div>
          <p className="text-[10px] font-bold text-slate-500 leading-tight">
            Asegúrate de tener buena iluminación en el producto
          </p>
        </div>
      </div>
    </div>
  );
}
