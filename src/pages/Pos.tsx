import React, { useState, useEffect, useMemo, useRef } from "react";
import { Product, SaleItem, User, Category } from "../types";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, AlertTriangle, Tag } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { fetchProducts, fetchCategories, createSale } from "../lib/supabaseService";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        p.barcode?.toLowerCase().includes(lowerSearch)
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

  const total = useMemo(() => cart.reduce((sum, item) => sum + ((item.precio || 0) * (item.cantidad || 0)), 0), [cart]);

  const handleFinalize = async () => {
    if (cart.length === 0) return;
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
        usuario_id: user.id
      });

      setCart([]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
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
                <h4 className="font-bold text-slate-800 leading-tight mb-2 flex-1">
                  {p.nombre}
                </h4>
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

        <div className="p-6 bg-slate-50/50 space-y-4">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">Total a Pagar</p>
              <h3 className="text-4xl font-black text-brand-forest tracking-tighter leading-none">
                {formatCurrency(total || 0)}
              </h3>
            </div>
          </div>
          
          <button
            onClick={handleFinalize}
            disabled={cart.length === 0 || isLoading}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95",
              cart.length === 0 || isLoading
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
              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-24 h-24 bg-brand-lime/20 text-brand-forest rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 size={48} />
              </motion.div>
              <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter uppercase">¡VENTA EXITOSA!</h3>
              <p className="text-slate-500 font-medium">El inventario se ha actualizado.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
