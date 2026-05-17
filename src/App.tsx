import React, { useState } from "react";
import Pos from "./pages/Pos";
import Inventory from "./pages/Inventory";
import Apartados from "./pages/Apartados";
import Reports from "./pages/Reports";
import Scanner from "./pages/Scanner";
import LowStock from "./pages/LowStock";
import Profile from "./pages/Profile";
import { User } from "./types";
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  BarChart3, 
  Menu,
  X,
  Camera,
  AlertTriangle,
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

type Page = "pos" | "inventory" | "apartados" | "reports" | "scanner" | "low-stock" | "profile";

const DEFAULT_USER: User = { id: 1, nombre: "Admin", activo: true };

export default function App() {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem("current_user");
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  const [currentPage, setCurrentPage] = useState<Page>("pos");

  const updateUser = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("current_user", JSON.stringify(newUser));
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const navItems = [
    { id: "pos", label: "Nueva Venta", icon: ShoppingCart },
    { id: "inventory", label: "Inventario", icon: Package },
    { id: "low-stock", label: "Stock Bajo", icon: AlertTriangle },
    { id: "apartados", label: "Apartados", icon: Clock },
    { id: "reports", label: "Reportes", icon: BarChart3 },
    { id: "scanner", label: "Escáner", icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center z-50">
        <h1 className="text-xl font-bold text-brand-forest">Fotos y Fiestas</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            className={cn(
              "fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 z-40 transition-all duration-300 md:relative md:translate-x-0",
              !isSidebarOpen && "hidden md:block"
            )}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="mb-10 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-lime rounded-xl flex items-center justify-center shadow-lg shadow-brand-lime/30">
                  <ShoppingCart size={20} className="text-brand-forest" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-brand-forest tracking-tighter leading-none">
                    Fotos y <br /> Fiestas
                  </h1>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id as Page);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group font-bold",
                      currentPage === item.id 
                        ? "bg-brand-lime text-brand-forest shadow-md shadow-brand-lime/20" 
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    )}
                  >
                    <item.icon size={20} className={cn(
                      "transition-transform group-hover:scale-110",
                      currentPage === item.id ? "text-brand-forest" : "text-slate-300"
                    )} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="pt-6 border-t border-slate-50 mt-auto">
                <button 
                  onClick={() => {
                    setCurrentPage("profile");
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-3 rounded-2xl transition-all group hover:bg-slate-50",
                    currentPage === "profile" && "bg-slate-50 ring-1 ring-slate-100"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 overflow-hidden shrink-0">
                    {user?.foto_perfil ? (
                      <img src={user.foto_perfil} alt={user.nombre} className="w-full h-full object-cover" />
                    ) : (
                      (user?.nombre || "A").charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-slate-700 truncate">{user?.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Vendedor</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        <header className="hidden md:flex bg-white px-8 py-5 items-center justify-between border-b border-gray-100 z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {navItems.find(n => n.id === currentPage)?.label}
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sistema Administrativo</p>
              <p className="text-sm font-bold text-slate-600">
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentPage === "pos" && <Pos user={user} />}
              {currentPage === "inventory" && (
                <Inventory 
                  initialScannedCode={scannedCode} 
                  onClearScannedCode={() => setScannedCode(null)} 
                />
              )}
              {currentPage === "apartados" && <Apartados />}
              {currentPage === "reports" && <Reports />}
              {currentPage === "low-stock" && <LowStock />}
              {currentPage === "profile" && (
                <Profile 
                  user={user} 
                  onUpdateUser={updateUser} 
                  onBack={() => setCurrentPage("pos")} 
                />
              )}
              {currentPage === "scanner" && (
                <Scanner 
                  onScanSuccess={(code) => {
                    setScannedCode(code);
                    setCurrentPage("inventory");
                  }} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
