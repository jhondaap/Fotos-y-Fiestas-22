import React, { useState } from "react";
import { User } from "../types";
import { User as UserIcon, Camera, Save, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { updateUser } from "../lib/supabaseService";

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

export default function Profile({ user, onUpdateUser, onBack }: ProfileProps) {
  const [nombre, setNombre] = useState(user.nombre);
  const [fotoPerfil, setFotoPerfil] = useState(user.foto_perfil || "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64
        setMessage({ type: "error", text: "La imagen es demasiado grande. Máximo 500KB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPerfil(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const data = await updateUser(user.id, { nombre, foto_perfil: fotoPerfil });
      if (data.success) {
        onUpdateUser(data.user as User);
        setMessage({ type: "success", text: "Perfil actualizado correctamente" });
      } else {
        setMessage({ type: "error", text: "Error al actualizar el perfil" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error de conexión con la base de datos" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-brand-forest transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      <div className="bg-white rounded-[3rem] p-8 sm:p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Mi Perfil</h2>
          <p className="text-slate-400 text-sm font-medium">Personaliza tu información de usuario</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-slate-300 ring-2 ring-slate-100 transition-all group-hover:ring-brand-lime">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} />
                )}
              </div>
              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-10 h-10 bg-brand-lime text-brand-forest rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                <Camera size={18} />
              </label>
              <input 
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Haz clic en la cámara para cambiar foto</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
              <input 
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-lime transition-all"
                placeholder="Tu nombre..."
                required
              />
            </div>
          </div>

          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-2xl text-xs font-bold text-center",
                message.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}
            >
              {message.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-brand-forest hover:bg-[#1B3022]/90 text-white font-black py-5 px-10 rounded-2xl shadow-xl shadow-brand-forest/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:grayscale"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
}
