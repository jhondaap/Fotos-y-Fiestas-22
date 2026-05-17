import React, { useState, useEffect } from "react";
import { Apartado } from "../types";
import { Plus, Search, User, Clock, CheckCircle2, DollarSign, Calendar, X, Save, MoreVertical, Trash2, Edit2, Trash } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  fetchApartados,
  createApartado,
  updateApartado,
  deleteApartado
} from "../lib/supabaseService";

export default function Apartados() {
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newApartado, setNewApartado] = useState<Partial<Apartado>>({
    cliente_nombre: "",
    descripcion: "",
    total: 0,
    abono: 0,
    fecha_entrega: new Date().toISOString().split('T')[0]
  });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [apartadoToDelete, setApartadoToDelete] = useState<Apartado | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await fetchApartados();
      setApartados(data);
    } catch (error) {
      console.error("Error fetching apartados:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newApartado.id) {
        // Update
        await updateApartado(newApartado.id, {
          cliente_nombre: newApartado.cliente_nombre,
          descripcion: newApartado.descripcion,
          total: Number(newApartado.total),
          abono: Number(newApartado.abono),
          fecha_entrega: newApartado.fecha_entrega
        });
      } else {
        // Create new
        await createApartado({
          cliente_nombre: newApartado.cliente_nombre,
          descripcion: newApartado.descripcion,
          total: Number(newApartado.total),
          abono: Number(newApartado.abono || 0),
          fecha_entrega: newApartado.fecha_entrega,
          estado: "Pendiente"
        });
      }
      setIsModalOpen(false);
      fetchData();
      setNewApartado({ 
        cliente_nombre: "", 
        descripcion: "", 
        total: 0, 
        abono: 0, 
        fecha_entrega: new Date().toISOString().split('T')[0] 
      });
    } catch (error) {
      console.error("Error saving apartado:", error);
      alert("Error al guardar apartado");
    }
  };

  const handleDeleteApartado = async () => {
    if (!apartadoToDelete) return;

    try {
      await deleteApartado(apartadoToDelete.id);
      setApartadoToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting apartado:", error);
      alert("Error al eliminar el apartado");
    }
  };

  const updateEstado = async (id: number, abono: number, estado: string) => {
    try {
      await updateApartado(id, { 
        abono: Number(abono), 
        estado: estado as "Pendiente" | "Entregado"
      });
      fetchData();
    } catch (error) {
      console.error("Error updating apartado status:", error);
      alert("Error al actualizar estado del apartado");
    }
  };

  const filteredApartados = apartados.filter(a => 
    a.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Control de Apartados</h2>
          <p className="text-slate-400 text-sm font-medium">Gestiona pedidos especiales y anticipos de clientes</p>
        </div>
        <button 
          onClick={() => {
            setNewApartado({ 
              cliente_nombre: "", 
              descripcion: "", 
              total: 0, 
              abono: 0, 
              fecha_entrega: new Date().toISOString().split('T')[0] 
            });
            setIsModalOpen(true);
          }}
          className="bg-brand-forest hover:bg-[#1B3022]/90 text-white font-bold py-4 px-8 rounded-2xl flex items-center gap-3 shadow-lg shadow-brand-forest/20 transition-all active:scale-95 relative z-10"
        >
          <Plus size={24} />
          Nuevo Apartado
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex-1 bg-slate-50 rounded-2xl px-6 flex items-center gap-3 border-2 border-transparent focus-within:border-brand-lime focus-within:bg-white transition-all">
          <Search className="text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o descripción..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full py-4 bg-transparent border-none outline-none text-slate-700 font-bold placeholder-slate-400 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApartados.map(a => (
          <motion.div 
            key={a.id}
            layout
            className={cn(
              "bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col transition-all relative overflow-hidden group shadow-sm hover:shadow-md",
              a.estado === 'Entregado' && "opacity-60 grayscale-[0.8]"
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 leading-none">{a.cliente_nombre}</h3>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Ref #{a.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                  a.estado === 'Pendiente' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                )}>
                  {a.estado}
                </span>
                
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === a.id ? null : a.id)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>

                  <AnimatePresence>
                    {activeMenuId === a.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 py-2"
                        >
                          <button
                            onClick={() => {
                              setNewApartado(a);
                              setIsModalOpen(true);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                          >
                            <Edit2 size={16} className="text-slate-400" />
                            Editar Apartado
                          </button>
                          <div className="h-px bg-slate-50 mx-2 my-1" />
                          <button
                            onClick={() => {
                              setApartadoToDelete(a);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <Trash2 size={16} />
                            Eliminar Apartado
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 mb-6 italic text-sm text-slate-500 flex-1 border border-slate-100/50">
              "{a.descripcion}"
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                <span className="font-bold text-slate-800">{formatCurrency(a.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abonado</span>
                <span className="font-bold text-brand-forest">{formatCurrency(a.abono)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-lime transition-all duration-1000" 
                  style={{ width: `${Math.min(100, ((a.abono || 0) / (a.total || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Restante</span>
                <span className="font-black text-xl text-red-500">{formatCurrency((a.total || 0) - (a.abono || 0))}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">
              <Calendar size={14} className="text-slate-300" />
              Entrega: {new Date(a.fecha_entrega || "").toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </div>

            {a.estado === 'Pendiente' && (
              <div className="flex gap-3">
                <button 
                  onClick={() => updateEstado(a.id, a.total, 'Pendiente')}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl py-3 text-xs font-bold transition-all active:scale-95"
                >
                  Liquidar
                </button>
                <button 
                  onClick={() => updateEstado(a.id, a.abono, 'Entregado')}
                  className="flex-1 bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest rounded-xl py-3 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-brand-lime/20"
                >
                  Entregar
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden" >
              <div className="bg-brand-forest p-8 text-white relative">
                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  {newApartado.id ? "Editar" : "Nuevo"} Apartado
                </h3>
                <p className="text-brand-lime text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                  {newApartado.id ? "Actualización de Pedido" : "Registro de Pedido"}
                </p>
                <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente</label>
                    <input required type="text" value={newApartado.cliente_nombre || ""} onChange={e => setNewApartado({...newApartado, cliente_nombre: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all" placeholder="Nombre completo..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descripción del pedido</label>
                    <textarea rows={2} value={newApartado.descripcion || ""} onChange={e => setNewApartado({...newApartado, descripcion: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all resize-none" placeholder="¿Qué incluye el apartado?" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Presupuesto</label>
                      <input required type="number" value={newApartado.total || 0} onChange={e => setNewApartado({...newApartado, total: Number(e.target.value)})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Abono Inicial</label>
                      <input required type="number" value={newApartado.abono || 0} onChange={e => setNewApartado({...newApartado, abono: Number(e.target.value)})} className="w-full bg-brand-lime/10 border-none rounded-2xl p-4 text-sm font-black text-brand-forest focus:ring-2 focus:ring-brand-lime outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha compromiso</label>
                    <input required type="date" value={newApartado.fecha_entrega || ""} onChange={e => setNewApartado({...newApartado, fecha_entrega: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-lime outline-none transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-brand-lime hover:bg-[#7DFA7D] text-brand-forest font-black py-5 rounded-3xl shadow-xl shadow-brand-lime/30 flex items-center justify-center gap-2 transition-all">
                  <Save size={20} /> {newApartado.id ? "GUARDAR CAMBIOS" : "REGISTRAR APARTADO"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {apartadoToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setApartadoToDelete(null)}
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
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-2">¿Eliminar Apartado?</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                Esta acción eliminará permanentemente el apartado de <span className="font-bold text-slate-800">"{apartadoToDelete.cliente_nombre}"</span>. No se puede deshacer.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setApartadoToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDeleteApartado}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-500/30 transition-all"
                >
                  SÍ, ELIMINAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
