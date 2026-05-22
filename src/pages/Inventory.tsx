import React, { useState, useEffect, useRef } from "react";
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
  Trash,
  QrCode,
  Scan,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useModalBackHandler } from "../hooks/useModalBackHandler";
import {
  fetchProducts,
  fetchCategories,
  fetchProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory
} from "../lib/supabaseService";

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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [scannerInput, setScannerInput] = useState("");
  const scannerRef = useRef<HTMLInputElement>(null);

  useModalBackHandler(isModalOpen, () => setIsModalOpen(false));
  useModalBackHandler(isCategoryModalOpen, () => setIsCategoryModalOpen(false));
  useModalBackHandler(!!productToDelete, () => setProductToDelete(null));

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setTimeout(() => {
        scannerRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  // 1. Abre el modal de Registro/Edición de forma totalmente instantánea al detectar el escaneo
  useEffect(() => {
    if (initialScannedCode) {
      setIsModalOpen(true);
      
      // Busca si el producto ya existe en el listado cargado actualmente
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
          categoria_id: categories.length > 0 ? categories[0].id : undefined, 
          barcode: initialScannedCode,
          descripcion: ""
        });
      }
      onClearScannedCode?.();
    }
  }, [initialScannedCode]);

  // 2. Sincroniza en segundo plano los datos si la consulta de productos de Supabase termina después de abrir el modal
  useEffect(() => {
    if (isModalOpen && editingProduct && !editingProduct.id && editingProduct.barcode && products.length > 0) {
      const match = products.find(p => p.barcode === editingProduct.barcode);
      if (match) {
        setEditingProduct(match);
      }
    }
  }, [products, isModalOpen, editingProduct]);

  // 3. Sincroniza la primera categoría disponible por defecto en cuanto la lista de categorías finalice su descarga
  useEffect(() => {
    if (isModalOpen && editingProduct && editingProduct.categoria_id === undefined && categories.length > 0) {
      setEditingProduct(prev => prev ? { ...prev, categoria_id: categories[0].id } : null);
    }
  }, [categories, isModalOpen, editingProduct]);

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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleScannerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scannerInput.trim()) return;

    try {
      const product = await fetchProductByBarcode(scannerInput);
      if (product) {
        setEditingProduct(product);
      } else {
        // Not found - prepare for new product
        setEditingProduct({ 
          nombre: "", 
          precio: 0, 
          costo: 0, 
          stock_actual: 0, 
          stock_minimo: 2, 
          categoria_id: categories.length > 0 ? categories[0].id : undefined, 
          barcode: scannerInput,
          descripcion: ""
        });
      }
      setIsModalOpen(true);
      setScannerInput("");
    } catch (error) {
      console.error("Error scanning barcode:", error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (editingProduct.id) {
        await updateProduct(String(editingProduct.id), editingProduct);
      } else {
        await createProduct(editingProduct);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error al guardar el producto");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.nombre_categoria.trim()) return;

    setIsCreatingCategory(true);
    setCategoryMessage(null);

    try {
      await createCategory(newCategory);
      setCategoryMessage({ type: "success", text: "¡Categoría registrada con éxito!" });
      
      // Keep modal open briefly to show success animation/state
      setTimeout(() => {
        setIsCategoryModalOpen(false);
        setNewCategory({ nombre_categoria: "", descripcion: "" });
        setCategoryMessage(null);
        fetchData();
      }, 1500);
    } catch (error) {
      console.error("Error creating category:", error);
      setCategoryMessage({ type: "error", text: "Error al registrar la categoría. Intente de nuevo." });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(String(productToDelete.id));
      setProductToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("No se pudo eliminar el producto. Podría estar en uso en ventas.");
    }
  };

  const handleUpdateStock = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock_actual + delta);
    if (newStock === product.stock_actual) return;

    // 1. Optimistic UI update
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === product.id ? { ...p, stock_actual: newStock } : p
      )
    );

    // 2. Persist to database in background
    try {
      await updateProduct(String(product.id), {
        ...product,
        stock_actual: newStock
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      // Revert on error
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id ? { ...p, stock_actual: product.stock_actual } : p
        )
      );
      alert("Error al actualizar el stock");
    }
  };

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.precio * p.stock_actual), 0);
  const totalCostValue = products.reduce((sum, p) => sum + (p.costo * p.stock_actual), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Scanner Section */}
      <div className="bg-brand-forest p-8 rounded-[3rem] shadow-2xl shadow-brand-forest/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/10 -mr-20 -mt-20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 bg-brand-lime text-brand-forest rounded-3xl flex items-center justify-center shadow-lg transform -rotate-3">
            <Scan size={40} />
          </div>
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Escáner de Inventario</h2>
            <p className="text-white/60 font-medium italic">Conecta tu escáner y apunta al código de barras para registrar o editar.</p>
          </div>
          <form 
            onSubmit={handleScannerSubmit}
            className="w-full md:w-auto min-w-[320px]"
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center text-brand-lime transition-transform group-focus-within:scale-110">
                <QrCode size={24} />
              </div>
              <input 
                ref={scannerRef}
                type="text"
                placeholder="Escanea o escribe código..."
                value={scannerInput}
                onChange={(e) => setScannerInput(e.target.value)}
                className="w-full bg-white/10 border-2 border-white/20 rounded-[2rem] py-6 pl-16 pr-6 text-xl font-black text-white placeholder:text-white/30 focus:bg-white/20 focus:border-brand-lime outline-none transition-all shadow-inner"
                autoFocus
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-brand-lime text-brand-forest rounded-2xl hover:bg-[#7DFA7D] transition-colors active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>

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
            onClick={() => { setEditingProduct({ nombre: "", precio: 0, costo: 0, stock_actual: 0, stock_minimo: 2, categoria_id: categories[0]?.id, barcode: "", descripcion: "" }); setIsModalOpen(true); }}
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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-bold tracking-wider">
                      <span>SKU: {p.barcode || "Sin código"}</span>
                      {p.descripcion && (
                        <>
                          <span className="text-slate-300 font-normal">•</span>
                          <span className="text-slate-400 font-medium normal-case italic" title={p.descripcion}>
                            {p.descripcion.length > 20 ? p.descripcion.substring(0, 20) + "..." : p.descripcion}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-forest bg-brand-lime/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {p.nombre_categoria}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "font-bold text-lg min-w-[20px] text-center",
                        p.stock_actual <= p.stock_minimo ? "text-red-500" : "text-slate-700"
                      )}>
                        {p.stock_actual}
                      </span>
                      
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStock(p, 1);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-brand-forest hover:bg-brand-lime/20 transition-all active:scale-90"
                          title="Incrementar Stock"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStock(p, -1);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                          title="Decrementar Stock"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      {p.stock_actual <= p.stock_minimo && (
                        <AlertTriangle size={16} className="text-red-500 animate-pulse ml-0.5" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Min: {p.stock_minimo}</p>
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
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
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
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block font-sans">Descripción del Producto</label>
                    <textarea 
                      value={editingProduct?.descripcion || ""}
                      onChange={e => setEditingProduct({ ...editingProduct, descripcion: e.target.value })}
                      rows={3}
                      placeholder="Detalles o especificaciones del producto..."
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Barcode</label>
                    <input 
                      type="text" 
                      value={editingProduct?.barcode || ""}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      disabled={!!editingProduct?.id}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center max-h-[90vh] overflow-y-auto"
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
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/5 -mr-12 -mt-12 rounded-full" />
                <h3 className="text-xl font-black uppercase tracking-tighter relative z-10">
                  Nueva Categoría
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="relative z-10"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateCategory} className="p-8 space-y-6">
                {categoryMessage && (
                  <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border",
                    categoryMessage.type === "success" 
                      ? "bg-brand-lime/10 text-brand-forest border-brand-lime/20" 
                      : "bg-red-50 text-red-500 border-red-100"
                  )}>
                    {categoryMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {categoryMessage.text}
                  </div>
                )}
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
                  disabled={isCreatingCategory}
                  className="w-full bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-black py-5 rounded-3xl shadow-xl shadow-brand-lime/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCategory ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      REGISTRANDO...
                    </>
                  ) : (
                    "REGISTRAR CATEGORÍA"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
