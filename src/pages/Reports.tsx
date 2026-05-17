import React, { useState, useEffect, useMemo } from "react";
import { DailyReport } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  X,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CalendarData {
  daily: { date: string; total: number }[];
  monthly: { month: string; total: number }[];
}

export default function Reports() {
  const [report, setReport] = useState<DailyReport>({ total_dia: 0, ganancia_dia: 0, ventas_count: 0 });
  const [soldItems, setSoldItems] = useState<{ nombre: string; total_cantidad: number; total_venta: number }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCloseDayOpen, setIsCloseDayOpen] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData>({ daily: [], monthly: [] });
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  useEffect(() => {
    fetchReport();
    fetchSoldItems();
  }, [date]);

  useEffect(() => {
    if (isCalendarOpen) {
      fetchCalendarData(currentViewDate.getFullYear());
    }
  }, [isCalendarOpen, currentViewDate]);

  const fetchReport = async () => {
    const res = await fetch(`/api/reports/daily?date=${date}`);
    setReport(await res.json());
  };

  const fetchSoldItems = async () => {
    const res = await fetch(`/api/reports/sold-items?date=${date}`);
    setSoldItems(await res.json());
  };

  const fetchCalendarData = async (year: number) => {
    const res = await fetch(`/api/reports/calendar?year=${year}`);
    setCalendarData(await res.json());
  };

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleCloseDay = async () => {
    const res = await fetch("/api/reports/close-day", { method: "POST" });
    if (res.ok) {
      setIsCloseDayOpen(false);
      // In a real scenario we'd redirect or reset
      alert("Corte de caja realizado con éxito. El reporte ha sido guardado.");
      fetchReport();
    }
  };

  // Calendar Helpers
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const getDayTotal = (day: number) => {
    // Create a date string in YYYY-MM-DD format using local time
    const year = currentViewDate.getFullYear();
    const month = (currentViewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    return calendarData.daily.find(d => d.date === dateStr)?.total || 0;
  };

  const getMonthTotal = (month: number) => {
    const monthStr = (month + 1).toString().padStart(2, '0');
    return calendarData.monthly.find(m => m.month === monthStr)?.total || 0;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-auto">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand-lime hover:text-brand-forest transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4">
            <Calendar size={18} className="text-slate-300" />
            <span className="font-bold text-slate-800 text-sm">
              {new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button 
            onClick={() => changeDate(1)}
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand-lime hover:text-brand-forest transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold text-sm shadow-sm hover:border-brand-lime transition-all flex items-center justify-center gap-2"
          >
            <BarChart3 size={18} />
            Calendario de Ventas
          </button>
          <button 
            onClick={() => {
              console.log("Opening close day modal");
              setIsCloseDayOpen(true);
            }}
            className="flex-1 sm:flex-none py-3 px-6 rounded-2xl bg-brand-forest text-white font-bold text-sm shadow-lg shadow-brand-forest/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            Cierre de Día
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-forest transition-transform group-hover:scale-110">
            <TrendingUp size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <DollarSign size={14} className="text-brand-lime" />
              Ingresos Brutos
            </p>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter">
              {formatCurrency(report.total_dia || 0)}
            </h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-forest p-8 rounded-[2.5rem] shadow-xl shadow-brand-forest/20 relative overflow-hidden group text-white"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 transition-transform group-hover:scale-110">
            <DollarSign size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} />
              Utilidad Neta
            </p>
            <h3 className="text-4xl font-black tracking-tighter">
              {formatCurrency(report.ganancia_dia || 0)}
            </h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-brand-lime p-8 rounded-[2.5rem] shadow-lg shadow-brand-lime/20 relative overflow-hidden group text-brand-forest"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 transition-transform group-hover:scale-110 text-brand-forest">
            <ShoppingCart size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-brand-forest/60 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calendar size={14} />
              Transacciones
            </p>
            <h3 className="text-5xl font-black tracking-tighter leading-none">
              {report.ventas_count || 0}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50">Ventas Registradas</p>
          </div>
        </motion.div>
      </div>

      {/* Information Box */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-lime/5 -ml-32 -mt-32 rounded-full blur-3xl pointer-events-none" />
        <div className="w-20 h-20 bg-brand-lime rounded-full flex items-center justify-center text-brand-forest shrink-0 shadow-lg shadow-brand-lime/30 relative z-10">
          <BarChart3 size={32} />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h4 className="text-xl font-bold mb-2">Análisis de Resultados</h4>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl font-medium">
            Las utilidades se calculan restando el costo de inversión al total de ventas. 
            Asegúrate de registrar los costos de proveedor para cada producto para obtener reportes precisos.
          </p>
        </div>
        <div className="shrink-0 relative z-10">
          <div className="bg-slate-800 px-6 py-4 rounded-2xl border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest text-center">Estado</p>
            <p className="font-bold text-lg text-brand-lime text-center italic">ACTIVO</p>
          </div>
        </div>
      </div>

      {/* Sold Items History */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
              <ShoppingCart size={24} className="text-brand-forest" />
              Historial de Productos Vendidos
            </h3>
            <p className="text-slate-400 text-sm font-medium">Bajo stock o ventas destacadas para este día.</p>
          </div>
        </div>

        {soldItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {soldItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-lime transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-lime group-hover:text-brand-forest transition-all">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.nombre}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total: {formatCurrency(item.total_venta)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Cant.</p>
                  <p className="text-xl font-black text-brand-forest">{item.total_cantidad}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100">
              <ShoppingCart size={24} />
            </div>
            <h4 className="text-slate-400 font-bold text-sm">No se encontraron ventas de productos para esta fecha.</h4>
          </div>
        )}
      </div>

      {/* Calendar Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-brand-forest p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Historial de Ventas</h3>
                  <div className="flex items-center gap-6 mt-2">
                    <p className="text-brand-lime text-[10px] font-bold uppercase tracking-widest opacity-70">Consulta por Periodos</p>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear() - 1, currentViewDate.getMonth()))} className="hover:text-brand-lime transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-black text-xl italic">{currentViewDate.getFullYear()}</span>
                      <button onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear() + 1, currentViewDate.getMonth()))} className="hover:text-brand-lime transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsCalendarOpen(false)} className="text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Year View / Monthly Summary */}
                <div className="lg:col-span-3 space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ingresos por Mes</h4>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const total = getMonthTotal(i);
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "flex justify-between items-center p-3 rounded-xl border transition-all cursor-pointer group",
                          currentViewDate.getMonth() === i ? "bg-brand-lime border-brand-lime text-brand-forest" : "bg-slate-50 border-transparent text-slate-500 hover:border-slate-200"
                        )}
                        onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear(), i, 1))}
                      >
                        <span className="text-xs font-bold capitalize">
                          {new Date(2000, i, 1).toLocaleDateString('es-MX', { month: 'long' })}
                        </span>
                        <div className="text-right">
                          <p className="text-[10px] font-black opacity-50 leading-none mb-1">Total</p>
                          <p className="text-sm font-black leading-none">{formatCurrency(total)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Day Grid */}
                <div className="lg:col-span-9 bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                    <h5 className="text-xl font-black text-slate-800 capitalize italic">
                      {currentViewDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </h5>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-3">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Juv', 'Vie', 'Sáb'].map(day => (
                      <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {day}
                      </div>
                    ))}
                    
                    {Array.from({ length: firstDayOfMonth(currentViewDate.getMonth(), currentViewDate.getFullYear()) }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    
                    {Array.from({ length: daysInMonth(currentViewDate.getMonth(), currentViewDate.getFullYear()) }).map((_, i) => {
                      const day = i + 1;
                      const total = getDayTotal(day);
                      
                      const d = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), day);
                      const dStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                      const isToday = dStr === todayStr;
                      
                      return (
                        <div 
                          key={day} 
                          className={cn(
                            "aspect-square rounded-2xl flex flex-col items-center justify-center relative group overflow-hidden transition-all border",
                            total > 0 ? "bg-white border-slate-200 shadow-sm" : "bg-slate-100/50 border-transparent opacity-40",
                            isToday && "border-brand-lime border-2 ring-2 ring-brand-lime/20"
                          )}
                        >
                          <span className="text-xs font-bold text-slate-400 group-hover:text-brand-forest transition-colors">{day}</span>
                          {total > 0 && (
                            <div className="absolute inset-0 bg-brand-lime flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[10px] font-black text-brand-forest/60 uppercase leading-none mb-1">Venta</p>
                              <p className="text-xs font-black text-brand-forest">{formatCurrency(total)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Close Day Modal */}
      <AnimatePresence>
        {isCloseDayOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCloseDayOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-20 h-20 bg-brand-lime rounded-full flex items-center justify-center text-brand-forest mx-auto mb-6 shadow-xl shadow-brand-lime/30">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Cierre de Caja</h3>
              <p className="text-slate-400 text-sm mb-8">¿Estás seguro que deseas cerrar el día? Se guardará el reporte final y las ventas del día quedarán registradas.</p>
              
              <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Total en Ventas</span>
                  <span className="font-black text-slate-800">{formatCurrency(report.total_dia)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Total Utilidad</span>
                  <span className="font-black text-brand-forest">{formatCurrency(report.ganancia_dia)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">Num. Transacciones</span>
                  <span className="font-black text-slate-800">{report.ventas_count}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCloseDay}
                  className="w-full py-5 rounded-3xl bg-brand-lime text-brand-forest font-black text-lg shadow-xl shadow-brand-lime/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  CONFIRMAR CIERRE
                </button>
                <button 
                  onClick={() => setIsCloseDayOpen(false)}
                  className="w-full py-4 rounded-2xl bg-slate-50 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
                >
                  Regresar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
