export interface Product {
  id: number;
  nombre: string;
  precio: number;
  costo: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: number;
  nombre_categoria?: string;
  barcode?: string;
}

export interface Category {
  id: number;
  nombre_categoria: string;
  descripcion?: string;
}

export interface User {
  id: number;
  nombre: string;
  activo: boolean;
  foto_perfil?: string;
}

export interface SaleItem {
  id: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Apartado {
  id: number;
  cliente_nombre: string;
  descripcion: string;
  total: number;
  abono: number;
  estado: "Pendiente" | "Entregado";
  fecha_entrega: string;
  creado_en: string;
}

export interface DailyReport {
  total_dia: number;
  ganancia_dia: number;
  ventas_count: number;
}
