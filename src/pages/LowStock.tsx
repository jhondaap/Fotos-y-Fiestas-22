import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { AlertTriangle, Package, RefreshCw, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency, cn } from "../lib/utils";
import { fetchProducts } from "../lib/supabaseService";

export default function LowStock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStock();
  }, []);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      // Filter for products where current stock is less than or equal to minimum stock
      const lowStockItems = data.filter(p => p.stock_actual <= p.stock_minimo);
      setProducts(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={32} />
            Stock Bajo
          </h2>
          <p className="text-slate-400 text-sm font-medium">
            Productos que han alcanzado o superado su límite mínimo de inventario.
          </p>
        </div>
        
        <button 
          onClick={fetchLowStock}
          className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-brand-forest hover:border-brand-lime transition-all shadow-sm"
        >
          <RefreshCw size={20} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-3xl border border-slate-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-12 border border-dashed border-slate-200 text-center space-y-4"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
            <Package size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Todo en orden</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">No hay productos con stock bajo en este momento. ¡Buen trabajo de inventario!</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 relative">
                  <Package size={24} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-white rounded-full" />
                </div>
                
                <div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-brand-forest transition-colors">
                    {product.nombre}
                  </h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Precio: {formatCurrency(product.precio)}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Min: {product.stock_minimo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    Stock Actual
                  </p>
                  <p className={cn(
                    "text-2xl font-black leading-none",
                    product.stock_actual === 0 ? "text-red-500" : "text-amber-500"
                  )}>
                    {product.stock_actual}
                  </p>
                </div>
                
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-lime group-hover:text-brand-forest transition-all">
                  <ChevronRight size={20} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
