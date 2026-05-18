import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export default function Scanner({ onScanSuccess }: ScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scanLoopRef = useRef<any>(null);

  // Initialize Html5Qrcode scanner using a hidden dummy container for decoding
  useEffect(() => {
    const dummyDiv = document.createElement("div");
    dummyDiv.id = "dummy-reader";
    dummyDiv.style.display = "none";
    document.body.appendChild(dummyDiv);

    try {
      html5QrCodeRef.current = new Html5Qrcode("dummy-reader");
    } catch (e) {
      console.error("Failed to initialize dummy Html5Qrcode container:", e);
    }

    return () => {
      document.body.removeChild(dummyDiv);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current = null;
      }
      if (scanLoopRef.current) {
        clearTimeout(scanLoopRef.current);
      }
    };
  }, []);

  // Cleanup active camera streams when unmounting the component
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const scanFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current || !html5QrCodeRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if the video stream contains valid playing frame data
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas frame to jpeg blob with slight compression to speed up scanning
        canvas.toBlob((blob) => {
          if (blob && isScanning) {
            html5QrCodeRef.current?.scanFile(blob, false)
              .then((decodedText) => {
                setLastResult(decodedText);
                setIsScanning(false);

                // Beep audio success feedback
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

                // Immediately stop hardware stream to turn off the mobile's camera light
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                  streamRef.current = null;
                }

                setTimeout(() => {
                  onScanSuccess(decodedText);
                }, 1000);
              })
              .catch(() => {
                // Barcode not found in this frame, loop again after 300ms
                if (isScanning) {
                  scanLoopRef.current = setTimeout(scanFrame, 300);
                }
              });
          } else if (isScanning) {
            scanLoopRef.current = setTimeout(scanFrame, 300);
          }
        }, "image/jpeg", 0.7);
      } else if (isScanning) {
        scanLoopRef.current = setTimeout(scanFrame, 300);
      }
    } else if (isScanning) {
      // Video not fully loaded yet, retry in 150ms
      scanLoopRef.current = setTimeout(scanFrame, 150);
    }
  };

  const startCameraScan = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    let stream: MediaStream | null = null;

    try {
      // PLAN A: Forzar Cámara Trasera usando constraints rigurosos { exact: "environment" }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } }
      });
    } catch (err1) {
      console.warn("PLAN A failed (exact camera environment), trying PLAN B (fallback environment)...", err1);
      try {
        // PLAN B: Reintentar con preferencia "environment" (ideal para PC con cámaras secundarias o teléfonos)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
      } catch (err2) {
        console.warn("PLAN B failed, trying PLAN C (any available camera)...", err2);
        try {
          // PLAN C: Intentar con cualquier cámara de video disponible en el equipo
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        } catch (err3: any) {
          console.error("All camera stream attempts failed:", err3);
          if (err3.name === "NotAllowedError" || err3.message?.includes("Permission denied")) {
            setErrorMessage("Por favor, permite el acceso a la cámara para poder escanear los productos de la fiesta.");
          } else {
            setErrorMessage(`No se pudo acceder a la cámara: ${err3.message || err3}`);
          }
          setIsLoading(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setIsScanning(true);
      setIsLoading(false);

      // Brief delay to ensure video element is fully mounted by React before binding srcObject
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          // Start the snapshot-based frame scan loop
          scanLoopRef.current = setTimeout(scanFrame, 400);
        }
      }, 150);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanLoopRef.current) {
      clearTimeout(scanLoopRef.current);
    }
  };

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
              className="flex flex-col items-center space-y-6 w-full relative z-10"
            >
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-4 rounded-2xl bg-red-50 text-red-500 border border-red-100 text-xs font-bold flex items-center gap-3 text-left"
                >
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-black text-sm mb-0.5">Acceso a Cámara</p>
                    <p className="text-red-400 font-medium leading-relaxed">{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              <div className="w-24 h-24 bg-brand-lime/10 rounded-full flex items-center justify-center text-brand-lime">
                <Camera size={48} />
              </div>
              <button
                onClick={startCameraScan}
                disabled={isLoading}
                className="bg-brand-forest hover:bg-[#1B3022]/90 text-white font-black py-5 px-10 rounded-3xl shadow-xl shadow-brand-forest/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Solicitando Permiso...
                  </>
                ) : (
                  <>
                    <Camera size={24} />
                    Abrir Cámara
                  </>
                )}
              </button>

              <div className="w-full relative py-2 flex items-center gap-4">
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
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="bg-brand-lime text-brand-forest font-black px-6 rounded-2xl disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02] active:scale-[0.98]"
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
              className="absolute inset-0 z-10 bg-black flex flex-col justify-center items-center"
            >
              {/* Viewfinder video element directly in DOM with custom cross-platform optimization settings */}
              <video
                ref={videoRef}
                playsInline={true}
                autoPlay={true}
                muted={true}
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              <button
                onClick={stopScanning}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all z-20"
              >
                <X size={24} />
              </button>
              
              <div className="absolute bottom-8 left-0 right-0 text-center z-20">
                <p className="text-white font-bold text-xs uppercase tracking-widest bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-md">
                  Apunta al Código de Barras
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
