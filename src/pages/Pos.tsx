import React, { useState, useEffect, useMemo, useRef } from "react";
import { Product, SaleItem, User, Category } from "../types";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, AlertTriangle, Tag, Printer } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { fetchProducts, fetchCategories, createSale } from "../lib/supabaseService";
import { useModalBackHandler } from "../hooks/useModalBackHandler";

interface PosProps {
  user: User;
}

export default function Pos({ user }: PosProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"Efectivo" | "Bold" | "Nequi">("Efectivo");
  const [pagoCon, setPagoCon] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [lastSale, setLastSale] = useState<{
    items: SaleItem[];
    total: number;
    metodoPago: "Efectivo" | "Bold" | "Nequi";
    pagoCon: string;
    vuelto: number;
    fecha: string;
  } | null>(null);
  const [showConfirmPrint, setShowConfirmPrint] = useState(false);

  useModalBackHandler(showSuccess, () => {
    setShowSuccess(false);
    setLastSale(null);
  });
  useModalBackHandler(showConfirmPrint, () => setShowConfirmPrint(false));

  const total = useMemo(() => cart.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 0)), 0), [cart]);

  const vuelto = useMemo(() => {
    if (metodoPago !== "Efectivo") return 0;
    const paidAmount = Number(pagoCon) || 0;
    return Math.max(0, paidAmount - total);
  }, [metodoPago, pagoCon, total]);

  const isPaymentInsufficient = useMemo(() => {
    if (metodoPago !== "Efectivo") return false;
    if (cart.length === 0) return false;
    if (!pagoCon) return false; // Si está vacío se asume pago exacto
    const paidAmount = Number(pagoCon) || 0;
    return paidAmount < total;
  }, [metodoPago, pagoCon, total, cart]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pData, cData] = await Promise.all([
        fetchProducts(),
        fetchCategories()
      ]);
      setProducts(pData);
      setCategories(cData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (selectedCategory) {
      result = result.filter(p => p.categoria_id === selectedCategory);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(lowerSearch) ||
        p.nombre_categoria?.toLowerCase().includes(lowerSearch) ||
        p.barcode?.toLowerCase().includes(lowerSearch) ||
        p.descripcion?.toLowerCase().includes(lowerSearch)
      );
    }

    return result.slice(0, 24);
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    if ((product.stock_actual || 0) <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cantidad >= (product.stock_actual || 0)) return prev;
        return prev.map(item => 
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { id: product.id, nombre: product.nombre, cantidad: 1, precio: product.precio || 0 }];
    });
  };

  // Improved scanner support: Handle Enter key or fast input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchTerm) {
      const match = products.find(p => p.barcode === searchTerm);
      if (match) {
        addToCart(match);
        setSearchTerm("");
      }
    }
  };

  // Auto-add if exact barcode match (for real-time scanners)
  useEffect(() => {
    if (!searchTerm) return;
    // Common barcodes are usually 8, 12 or 13 digits
    if (searchTerm.length >= 8) {
      const exactMatch = products.find(p => p.barcode === searchTerm);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchTerm("");
      }
    }
  }, [searchTerm, products]);

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const product = products.find(p => p.id === id);
          const newQty = item.cantidad + delta;
          if (newQty <= 0) return item;
          if (product && newQty > product.stock_actual) return item;
          return { ...item, cantidad: newQty };
        }
        return item;
      }).filter(item => item.cantidad > 0);
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };



  const handleFinalize = async () => {
    if (cart.length === 0) return;
    if (isPaymentInsufficient) return;
    setIsLoading(true);

    try {
      // Calculate total profit
      const ganancia_total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        const costo = product?.costo || 0;
        return sum + (((item.precio || 0) - costo) * (item.cantidad || 0));
      }, 0);

      await createSale({
        items: cart,
        total_venta: total,
        ganancia_total,
        usuario_id: user.id,
        metodo_pago: metodoPago,
        pago_con: metodoPago === "Efectivo" ? (Number(pagoCon) || total) : total
      });

      const now = new Date();
      const saleDate = now.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }) + " " + now.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      setLastSale({
        items: [...cart],
        total: total,
        metodoPago: metodoPago,
        pagoCon: metodoPago === "Efectivo" ? (pagoCon || String(total)) : String(total),
        vuelto: vuelto,
        fecha: saleDate
      });

      setCart([]);
      setPagoCon("");
      setMetodoPago("Efectivo");
      setShowSuccess(true);
      fetchData(); // Refresh stocks
    } catch (err) {
      console.error(err);
      alert("Error al procesar la venta");
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockCount = useMemo(() => products.filter(p => (p.stock_actual || 0) <= (p.stock_minimo || 0)).length, [products]);

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 overflow-hidden">
      {/* Search & Products Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar o escanear producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-50 border-none rounded-full py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-brand-lime outline-none transition-all placeholder:font-medium"
                autoFocus
              />
            </div>
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold whitespace-nowrap">
                <AlertTriangle size={16} />
                <strong>{lowStockCount}</strong> stock crítico
              </div>
            )}
          </div>

          {/* Categories Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                selectedCategory === null 
                  ? "bg-brand-forest text-white" 
                  : "bg-white text-slate-400 border border-slate-100 hover:border-brand-lime"
              )}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                  cat.id === selectedCategory 
                    ? "bg-brand-lime text-brand-forest" 
                    : "bg-white text-slate-400 border border-slate-100 hover:border-brand-lime"
                )}
              >
                <Tag size={12} />
                {cat.nombre_categoria}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 pb-4">
            {filteredProducts.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(p)}
                disabled={(p.stock_actual || 0) <= 0}
                className={cn(
                  "bg-white p-4 rounded-3xl border border-gray-100 shadow-sm transition-all text-left flex flex-col h-full",
                  (p.stock_actual || 0) <= 0 ? "opacity-50 grayscale cursor-not-allowed" : "hover:border-brand-lime hover:shadow-md"
                )}
              >
                <div className="bg-brand-lime/10 text-brand-forest text-[10px] font-bold px-2 py-0.5 mb-3 self-start rounded-md inline-block uppercase tracking-wider">
                  {p.nombre_categoria}
                </div>
                <h4 className="font-bold text-slate-800 leading-tight mb-1 flex-1">
                  {p.nombre}
                </h4>
                {p.descripcion && (
                  <p className="text-[11px] text-slate-400 font-medium normal-case italic mb-2 line-clamp-1" title={p.descripcion}>
                    {p.descripcion.length > 20 ? p.descripcion.substring(0, 20) + "..." : p.descripcion}
                  </p>
                )}
                <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Stock</p>
                    <p className={cn("font-bold text-sm leading-none", (p.stock_actual || 0) <= (p.stock_minimo || 0) ? "text-red-500" : "text-slate-600")}>
                      {p.stock_actual}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Precio</p>
                    <p className="font-black text-brand-forest text-lg leading-none">{formatCurrency(p.precio || 0)}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-96 bg-white rounded-[2.5rem] shadow-xl border border-gray-50 flex flex-col overflow-hidden relative">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-brand-forest" strokeWidth={2.5} />
            Ticket de Venta
          </h2>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {cart.length} Artículos
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-4">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="font-bold uppercase tracking-widest text-[10px]">CARRITO VACÍO</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={item.id} 
                  className="bg-slate-50 rounded-2xl p-4 relative group border border-transparent hover:border-brand-lime/30 transition-all"
                >
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-red-100"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-bold text-slate-800 leading-none mb-1">{item.nombre}</p>
                      <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">
                        {formatCurrency(item.precio)} c/u
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand-forest">
                        {formatCurrency((item.precio || 0) * (item.cantidad || 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border border-slate-100 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 hover:bg-slate-50 text-slate-400 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-700 min-w-8 text-center">{item.cantidad}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 hover:bg-slate-50 text-slate-400 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 bg-slate-50/50 space-y-5 border-t border-slate-100">
          {/* Payment Method Selector */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Método de Pago</label>
              <select
                value={metodoPago}
                onChange={(e) => {
                  const val = e.target.value as "Efectivo" | "Bold" | "Nequi";
                  setMetodoPago(val);
                  if (val !== "Efectivo") setPagoCon("");
                }}
                className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-lime/50 focus:border-brand-lime transition-all cursor-pointer shadow-sm hover:border-slate-300"
              >
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Bold">💳 Bold</option>
                <option value="Nequi">📱 Nequi</option>
              </select>
            </div>
          )}

          {/* Conditional Cash Calculation Inputs */}
          {cart.length > 0 && metodoPago === "Efectivo" && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  ¿Con cuánto paga el cliente?
                </label>
                <input
                  type="number"
                  placeholder={`Ej: ${total}`}
                  value={pagoCon}
                  onChange={(e) => setPagoCon(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-lime/50 focus:border-brand-lime transition-all"
                />
              </div>
              <div>
                <div className={cn(
                  "p-3.5 rounded-2xl text-xs font-black tracking-wide text-center border transition-all",
                  isPaymentInsufficient
                    ? "bg-red-50 border-red-100 text-red-500"
                    : "bg-brand-lime/10 border-brand-lime/20 text-brand-forest"
                )}>
                  {isPaymentInsufficient 
                    ? "⚠️ Monto Insuficiente" 
                    : `Cambio a devolver: ${formatCurrency(vuelto)}`}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between items-end pt-1">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total a Pagar</p>
              <h3 className="text-4xl font-black text-brand-forest tracking-tighter leading-none">
                {formatCurrency(total || 0)}
              </h3>
            </div>
          </div>
          
          <button
            onClick={handleFinalize}
            disabled={cart.length === 0 || isLoading || isPaymentInsufficient}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95",
              cart.length === 0 || isLoading || isPaymentInsufficient
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest shadow-brand-lime/40"
            )}
          >
            {isLoading ? "PROCESANDO..." : (
              <>
                <CheckCircle2 size={24} strokeWidth={3} />
                FINALIZAR VENTA
              </>
            )}
          </button>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center max-h-[90vh] overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-24 h-24 bg-brand-lime/20 text-brand-forest rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 size={48} />
              </motion.div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter uppercase">¡VENTA EXITOSA!</h3>
              <p className="text-slate-500 font-medium mb-4">El inventario se ha actualizado.</p>
              
              <div className="flex flex-col gap-3 w-full max-w-[240px] mt-2">
                <button
                  onClick={() => setShowConfirmPrint(true)}
                  className="w-full py-3.5 bg-brand-lime text-brand-forest font-black rounded-2xl shadow-lg shadow-brand-lime/20 hover:bg-[#7DFA7D] transition-all active:scale-95 text-sm uppercase tracking-widest flex items-center justify-center gap-2 border border-brand-lime/40"
                >
                  <Printer size={18} strokeWidth={2.5} />
                  Imprimir Ticket
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setLastSale(null);
                  }}
                  className="w-full py-3.5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-sm uppercase tracking-widest"
                >
                  Nueva Venta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal for Print */}
      <AnimatePresence>
        {showConfirmPrint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] border border-brand-lime/30 p-6 max-w-sm w-full shadow-2xl text-center max-h-[90vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-brand-lime/10 text-brand-forest rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-lime/20">
                <Printer size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800 mb-2">¿Imprimir comprobante?</h4>
              <p className="text-slate-500 text-sm font-medium mb-6">
                Se enviará el documento a la impresora de tiques configurada en el sistema.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmPrint(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all text-sm uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowConfirmPrint(false);
                    setTimeout(() => {
                      window.print();
                    }, 150);
                  }}
                  className="flex-1 py-3.5 bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-bold rounded-2xl transition-all text-sm uppercase tracking-widest"
                >
                  Confirmar Impresión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable Ticket Area */}
      {lastSale && (
        <div id="ticket-print-area">
          <div style={{ textAlign: "center", marginBottom: "15px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 5px 0", textTransform: "uppercase" }}>Fotos y Fiestas</h1>
            <p style={{ fontSize: "10px", margin: "2px 0", color: "#555" }}>Dirección: Carulla Guadalupe Segundo Piso - Fotos y Fiestas</p>
            <p style={{ fontSize: "10px", margin: "2px 0", color: "#555" }}>Teléfono: 304 312 3432</p>
            <p style={{ fontSize: "11px", margin: "5px 0 0 0", color: "#333", fontWeight: "bold" }}>Comprobante de Venta</p>
          </div>

          <div style={{ borderBottom: "1px dashed #000", paddingBottom: "8px", marginBottom: "8px", fontSize: "11px" }}>
            <p style={{ margin: "4px 0" }}><strong>Fecha:</strong> {lastSale.fecha}</p>
            <p style={{ margin: "4px 0" }}><strong>Método de Pago:</strong> {lastSale.metodoPago}</p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "8px" }}>
            <thead>
              <tr style={{ borderBottom: "1px dashed #000" }}>
                <th style={{ textAlign: "left", paddingBottom: "5px", width: "10%" }}>Cant</th>
                <th style={{ textAlign: "left", paddingBottom: "5px", width: "50%" }}>Producto</th>
                <th style={{ textAlign: "right", paddingBottom: "5px", width: "20%" }}>Unit</th>
                <th style={{ textAlign: "right", paddingBottom: "5px", width: "20%" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lastSale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "4px 0", verticalAlign: "top" }}>{item.cantidad}</td>
                  <td style={{ padding: "4px 0", verticalAlign: "top", wordBreak: "break-word" }}>
                    {item.nombre.length > 25 ? item.nombre.substring(0, 22) + "..." : item.nombre}
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right", verticalAlign: "top" }}>
                    {formatCurrency(item.precio)}
                  </td>
                  <td style={{ padding: "4px 0", textAlign: "right", verticalAlign: "top" }}>
                    {formatCurrency(item.cantidad * item.precio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #000", paddingTop: "8px", fontSize: "11px", marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "12px", margin: "4px 0" }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(lastSale.total)}</span>
            </div>
            {lastSale.metodoPago === "Efective" || lastSale.metodoPago === "Efectivo" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>Pagó con:</span>
                  <span>{formatCurrency(Number(lastSale.pagoCon) || lastSale.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0" }}>
                  <span>Cambio:</span>
                  <span>{formatCurrency(lastSale.vuelto)}</span>
                </div>
              </>
            ) : null}
          </div>

          <div style={{ textAlign: "center", marginTop: "20px", borderTop: "1px dashed #000", paddingTop: "10px", fontSize: "11px" }}>
            <p style={{ margin: "0", fontWeight: "bold" }}>¡Gracias por tu compra!</p>
          </div>
        </div>
      )}
    </div>
  );
}
