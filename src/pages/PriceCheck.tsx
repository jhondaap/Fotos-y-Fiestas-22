import React, { useState, useEffect, useMemo, useRef } from "react";
import { Product } from "../types";
import { Search, Scan, X, Tag, AlertTriangle, CheckCircle2, Camera, Package, AlertCircle } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { fetchProducts } from "../lib/supabaseService";
import { motion, AnimatePresence } from "motion/react";
import Scanner from "./Scanner";
import { useModalBackHandler } from "../hooks/useModalBackHandler";

export default function PriceCheck() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products for price check:", error);
    }
  };

  // Buscar coincidencia exacta por barcode para escáneres físicos
  useEffect(() => {
    if (!searchTerm) return;
    
    // Si el término coincide exactamente con el código de barras de un producto, seleccionarlo directamente
    const exactMatch = products.find(p => p.barcode === searchTerm.trim());
    if (exactMatch) {
      setSelectedProduct(exactMatch);
      setSearchTerm("");
      setErrorMessage(null);
      searchInputRef.current?.blur();
    }
  }, [searchTerm, products]);

  // Manejar envío del formulario de búsqueda (Enter o click)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Buscar coincidencia en código de barras o primer resultado de la lista
    const term = searchTerm.toLowerCase().trim();
    const match = products.find(p => p.barcode === term) || 
                  products.find(p => p.nombre.toLowerCase().includes(term));

    if (match) {
      setSelectedProduct(match);
      setSearchTerm("");
      setErrorMessage(null);
      searchInputRef.current?.blur();
    } else {
      setErrorMessage(`No se encontró ningún producto para: "${searchTerm}"`);
      setSelectedProduct(null);
    }
  };

  // Autocompletar / Sugerencias de búsqueda filtradas
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.nombre.toLowerCase().includes(term) || 
      p.descripcion?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term)
    ).slice(0, 5); // Limitar a las primeras 5 sugerencias para que sea rápido y limpio
  }, [searchTerm, products]);

  // Manejar el resultado de escaneo con la cámara
  const handleScanSuccess = (code: string) => {
    setIsScannerOpen(false);
    const match = products.find(p => p.barcode === code.trim());
    
    if (match) {
      setSelectedProduct(match);
      setErrorMessage(null);
    } else {
      setErrorMessage(`Código escaneado: "${code}" (No registrado en inventario)`);
      setSelectedProduct(null);
    }
  };

  // Interceptar botón atrás para cerrar el escáner de cámara
  useModalBackHandler(isScannerOpen, () => setIsScannerOpen(false));

  // Interceptar botón atrás para limpiar el producto consultado actual y volver a buscar
  useModalBackHandler(!!selectedProduct, () => {
    setSelectedProduct(null);
    setTimeout(() => searchInputRef.current?.focus(), 150);
  });

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6 pb-10">
      
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Consultar Precios</h2>
        <p className="text-slate-400 text-sm font-medium">Verifica precios y stock de forma rápida frente al cliente</p>
      </div>

      {/* Controles de Búsqueda */}
      <div className="relative bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Escribe el nombre, descripción o escanea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-lime outline-none transition-all placeholder:text-slate-400"
              autoFocus
            />
          </div>
          
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest p-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-brand-lime/20 transition-all active:scale-95 shrink-0"
            title="Escanear con Cámara"
          >
            <Camera size={20} />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </form>

        {/* Sugerencias de Búsqueda */}
        <AnimatePresence>
          {filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-6 right-6 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-30 overflow-hidden divide-y divide-slate-50"
            >
              {filteredSuggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProduct(p);
                    setSearchTerm("");
                    setErrorMessage(null);
                  }}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 flex justify-between items-center transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-700 group-hover:text-brand-forest transition-colors">{p.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                      SKU: {p.barcode || "Sin código"} • {p.nombre_categoria}
                    </p>
                  </div>
                  <span className="font-black text-brand-forest">{formatCurrency(p.precio)}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Errores */}
      <AnimatePresence>
        {errorMessage && !selectedProduct && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-2xl bg-red-50 text-red-500 border border-red-100 text-sm font-bold flex items-center gap-3"
          >
            <AlertCircle size={20} className="shrink-0" />
            <div className="flex-1">
              {errorMessage}
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display Principal (Pantalla Gigante Informativa) */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {selectedProduct ? (
            <motion.div
              key={selectedProduct.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-brand-forest text-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-brand-forest/30 relative overflow-hidden flex flex-col justify-between min-h-[380px]"
            >
              {/* Círculo de luz decorativo de fondo */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-lime/10 -mr-24 -mt-24 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 -ml-24 -mb-24 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex justify-between items-start mb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black bg-brand-lime/20 text-brand-lime px-3 py-1 rounded-full uppercase tracking-widest border border-brand-lime/30">
                    <Tag size={12} />
                    {selectedProduct.nombre_categoria}
                  </span>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-3">
                    Código de Barras / SKU: <span className="font-mono text-white">{selectedProduct.barcode || "N/A"}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
                  title="Limpiar consulta"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative z-10 space-y-4 my-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase select-all">
                  {selectedProduct.nombre}
                </h1>
                {selectedProduct.descripcion && (
                  <p className="text-base md:text-lg text-white/70 italic font-medium max-w-2xl">
                    "{selectedProduct.descripcion}"
                  </p>
                )}
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 border-t border-white/10 mt-8">
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1.5">Precio de Venta</p>
                  <p className="text-5xl md:text-6xl font-black text-brand-lime tracking-tighter select-all">
                    {formatCurrency(selectedProduct.precio)}
                  </p>
                </div>
                
                <div className="flex flex-col justify-end sm:items-end">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1.5 sm:text-right">Stock Disponible</p>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-4xl md:text-5xl font-black tracking-tight",
                      selectedProduct.stock_actual <= selectedProduct.stock_minimo 
                        ? "text-red-400" 
                        : "text-white"
                    )}>
                      {selectedProduct.stock_actual} unidades
                    </span>
                    {selectedProduct.stock_actual <= selectedProduct.stock_minimo && (
                      <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 animate-pulse" title="Stock Crítico / Bajo">
                        <AlertTriangle size={20} />
                      </div>
                    )}
                  </div>
                  {selectedProduct.stock_actual <= selectedProduct.stock_minimo && (
                    <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest mt-1">
                      Stock crítico (Mínimo: {selectedProduct.stock_minimo})
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center min-h-[300px]"
            >
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-md mb-6 border border-slate-100">
                <Package size={36} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 tracking-tight mb-2">Esperando Escaneo o Búsqueda</h3>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-medium">
                Pasa un producto por el lector de código de barras, escribe en el buscador o activa la cámara para verificar sus datos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal del Escáner de Cámara */}
      <AnimatePresence>
        {isScannerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScannerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-brand-forest p-6 text-white flex justify-between items-center relative">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Escáner de Precios</h3>
                  <p className="text-[10px] text-brand-lime font-bold uppercase tracking-wider mt-0.5">Lector de Barra</p>
                </div>
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <Scanner onScanSuccess={handleScanSuccess} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
