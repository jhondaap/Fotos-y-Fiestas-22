import React, { useState } from "react";
import { User } from "../types";
import { motion } from "motion/react";
import { Lock, KeyRound } from "lucide-react";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError("PIN incorrecto o usuario inactivo");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-lime flex items-center justify-center p-6 select-none">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center border border-gray-100"
      >
        <div className="w-20 h-20 bg-brand-lime/20 rounded-3xl flex items-center justify-center text-brand-forest mb-8 border-4 border-brand-lime/10">
          <Lock size={32} strokeWidth={2.5} />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter">BIENVENIDO</h1>
          <p className="text-slate-400 font-medium mt-1">Ingresa tu PIN de acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <KeyRound size={20} className="text-slate-300" />
            </div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={4}
              className="w-full bg-gray-50 border-none rounded-3xl py-4 pl-14 pr-5 text-2xl tracking-[0.5em] font-bold text-slate-700 focus:ring-2 focus:ring-brand-lime outline-none transition-all placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-300"
              required
              autoFocus
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-bold text-center bg-red-50 py-3 rounded-2xl"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-lime hover:bg-[#7DFA7D] active:scale-95 text-brand-forest font-black py-4 rounded-3xl shadow-xl shadow-brand-lime/30 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? "CARGANDO..." : "ACCEDER AL SISTEMA"}
          </button>
        </form>

        <p className="mt-10 text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
          Fotos y Fiestas • v1.0
        </p>
      </motion.div>
    </div>
  );
}
