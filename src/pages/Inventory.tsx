import React, { useState, useEffect } from "react";
import { Product, Category } from "../types";
import { 
  Plus, 
  Search, 
  Edit2, 
  Filter, 
  AlertTriangle, 
  Tag,
  ChevronRight,
  Save,
  X,
  MoreVertical,
  Trash2,
  Trash
} from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface InventoryProps {
  initialScannedCode?: string | null;
  onClearScannedCode?: () => void;
}

export default function Inventory({ initialScannedCode, onClearScannedCode }: InventoryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ nombre_categoria: "", descripcion: "" });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialScannedCode && products.length > 0) {
      const existingProduct = products.find(p => p.barcode === initialScannedCode);
      if (existingProduct) {
        setEditingProduct(existingProduct);
      } else {
        setEditingProduct({ 
          nombre: "", 
          precio: 0, 
          costo: 0, 
          stock_actual: 0, 
          stock_minimo: 2, 
          categoria_id: categories[0]?.id, 
          barcode: initialScannedCode 
        });
      }
      setIsModalOpen(true);
      onClearScannedCode?.();
    }
  }, [initialScannedCode, products, categories, onClearScannedCode]);

  const fetchData = async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);
    setProducts(await pRes.json());
    setCategories(await cRes.json());
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const method = editingProduct.id ? "PATCH" : "POST";
    const url = editingProduct.id ? `/api/products/${editingProduct.id}` : "/api/products";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingProduct),
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCategory),
    });

    if (res.ok) {
      setIsCategoryModalOpen(false);
      setNewCategory({ nombre_categoria: "", descripcion: "" });
      fetchData();
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProductToDelete(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.precio * p.stock_actual), 0);
  const totalCostValue = products.reduce((sum, p) => sum + (p.costo * p.stock_actual), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-forest group-hover:scale-110 transition-transform">
            <Tag size={60} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Venta Stock</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter">{formatCurrency(totalInventoryValue || 0)}</p>
        </div>
        <div className="bg-brand-forest p-6 rounded-[2rem] shadow-xl shadow-brand-forest/20 relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Save size={60} />
          </div>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Costo Inversión</p>
          <p className="text-3xl font-black tracking-tighter">{formatCurrency(totalCostValue || 0)}</p>
        </div>
      </div>

      {/* Top Controls */}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-end bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
          <div className="flex-1 max-w-xl">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buscar producto</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="Nombre o barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-lime outline-none transition-all"
              />
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-brand-lime outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_categoria}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Tag size={18} />
            Categoría
          </button>
          <button 
            onClick={() => { setEditingProduct({ nombre: "", precio: 0, costo: 0, stock_actual: 0, stock_minimo: 2, categoria_id: categories[0]?.id, barcode: "" }); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/30 transition-all active:scale-95"
          >
            <Plus size={18} />
            Producto
          </button>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Costo</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-800 leading-none mb-1">{p.nombre}</div>
                    <div className="text-[10px] text-slate-400 font-bold tracking-wider">SKU: {p.barcode || "Sin código"}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-forest bg-brand-lime/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {p.nombre_categoria}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold text-lg",
                        p.stock_actual <= p.stock_minimo ? "text-red-500" : "text-slate-700"
                      )}>
                        {p.stock_actual}
                      </span>
                      {p.stock_actual <= p.stock_minimo && (
                        <AlertTriangle size={16} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Min: {p.stock_minimo}</p>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-slate-800">
                    {formatCurrency(p.precio || 0)}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-slate-300">
                    {formatCurrency(p.costo || 0)}
                  </td>
                  <td className="px-6 py-5 text-center relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>

                    <AnimatePresence>
                      {activeMenuId === p.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-full mr-2 top-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2"
                          >
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsModalOpen(true);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                            >
                              <Edit2 size={16} className="text-slate-400" />
                              Editar Producto
                            </button>
                            <div className="h-px bg-slate-50 mx-2 my-1" />
                            <button
                              onClick={() => {
                                setProductToDelete(p);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                            >
                              <Trash2 size={16} />
                              Eliminar Producto
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-brand-forest p-8 text-white flex justify-between items-center relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">
                    {editingProduct?.id ? "Editar" : "Nuevo"} Producto
                  </h3>
                  <p className="text-brand-lime text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Actualización de Catálogo</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="relative z-10 hover:scale-110 transition-transform">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Nombre del Producto</label>
                    <input 
                      required
                      type="text" 
                      value={editingProduct?.nombre}
                      onChange={e => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Barcode</label>
                    <input 
                      type="text" 
                      value={editingProduct?.barcode || ""}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
                    <select 
                      required
                      value={editingProduct?.categoria_id}
                      onChange={e => setEditingProduct({ ...editingProduct, categoria_id: Number(e.target.value) })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all appearance-none"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nombre_categoria}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Precio Venta</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={editingProduct?.precio || 0}
                      onChange={e => setEditingProduct({ ...editingProduct, precio: Number(e.target.value) })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-brand-forest focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Costo Proveedor</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingProduct?.costo || 0}
                      onChange={e => setEditingProduct({ ...editingProduct, costo: Number(e.target.value) })}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-400 focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Stock Actual</label>
                    <input 
                      required
                      type="number" 
                      value={editingProduct?.stock_actual || 0}
                      onChange={e => setEditingProduct({ ...editingProduct, stock_actual: Number(e.target.value) })}
                      className="w-full bg-brand-lime/10 border-none rounded-2xl p-4 text-sm font-black text-brand-forest focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Stock Mínimo</label>
                    <input 
                      required
                      type="number" 
                      value={editingProduct?.stock_minimo || 2}
                      onChange={e => setEditingProduct({ ...editingProduct, stock_minimo: Number(e.target.value) })}
                      className="w-full bg-red-50 border-none rounded-2xl p-4 text-sm font-black text-red-500 focus:ring-2 focus:ring-red-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-3xl transition-all"
                  >
                    DESCARTAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-black py-5 rounded-3xl shadow-xl shadow-brand-lime/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    GUARDAR CAMBIOS
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">¿Eliminar Producto?</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Esta acción eliminará permanentemente a <span className="font-bold text-slate-800">"{productToDelete.nombre}"</span> de tu inventario. No se puede deshacer.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all"
                >
                  SÍ, ELIMINAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/5 -mr-12 -mt-12 rounded-full" />
                <h3 className="text-xl font-black uppercase tracking-tighter relative z-10">
                  Nueva Categoría
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="relative z-10"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateCategory} className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre</label>
                  <input 
                    required
                    type="text" 
                    value={newCategory.nombre_categoria}
                    onChange={e => setNewCategory({ ...newCategory, nombre_categoria: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all"
                    placeholder="Globos, Velas, etc..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción (Opcional)</label>
                  <textarea 
                    rows={4}
                    value={newCategory.descripcion}
                    onChange={e => setNewCategory({ ...newCategory, descripcion: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all resize-none"
                    placeholder="Detalles de la categoría..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-black py-5 rounded-3xl shadow-xl shadow-brand-lime/30 transition-all"
                >
                  REGISTRAR CATEGORÍA
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
