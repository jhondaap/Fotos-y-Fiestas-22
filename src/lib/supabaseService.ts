import { supabase } from "./supabaseClient";
import { Product, Category, User, SaleItem, Apartado, DailyReport } from "../types";

// ==========================================
// MAPPERS (To maintain frontend compatibility)
// ==========================================

export const mapProductoToProduct = (p: any): Product => {
  if (!p) return p;
  return {
    id: p.id_codigo_barras, // Map id_codigo_barras to id (string)
    nombre: p.nombre,
    precio: Number(p.precio_venta),
    costo: Number(p.precio_costo),
    stock_actual: Number(p.stock),
    stock_minimo: Number(p.stock_minimo),
    categoria_id: p.categoria_id,
    nombre_categoria: p.categorias?.nombre_categoria || "",
    barcode: p.id_codigo_barras
  };
};

// ==========================================
// USUARIOS (USERS)
// ==========================================

export const loginUser = async (pin: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("pin_acceso", pin)
    .eq("activo", true);

  if (error) throw error;
  return data && data.length > 0 ? { success: true, user: data[0] } : { success: false, message: "PIN incorrecto" };
};

export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, activo, foto_perfil");

  if (error) throw error;
  return (data || []) as User[];
};

export const updateUser = async (id: number, updates: Partial<User> & { foto_perfil?: string }) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update(updates)
    .eq("id", id)
    .select("id, nombre, activo, foto_perfil")
    .single();

  if (error) throw error;
  return { success: true, user: data };
};

// ==========================================
// CATEGORIAS (CATEGORIES)
// ==========================================

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("nombre_categoria", { ascending: true });

  if (error) throw error;
  return (data || []) as Category[];
};

export const createCategory = async (categoria: { nombre_categoria: string; descripcion?: string }) => {
  const { data, error } = await supabase
    .from("categorias")
    .insert([categoria])
    .select("id")
    .single();

  if (error) throw error;
  return data;
};

// ==========================================
// PRODUCTOS (PRODUCTS)
// ==========================================

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("productos")
    .select("*, categorias(nombre_categoria)")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapProductoToProduct);
};

export const fetchProductByBarcode = async (barcode: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("productos")
    .select("*, categorias(nombre_categoria)")
    .eq("id_codigo_barras", barcode);

  if (error) throw error;
  if (!data || data.length === 0) return null;
  return mapProductoToProduct(data[0]);
};

export const createProduct = async (product: Partial<Product>) => {
  const dbProduct = {
    id_codigo_barras: product.barcode,
    nombre: product.nombre,
    precio_costo: product.costo || 0,
    precio_venta: product.precio || 0,
    stock: product.stock_actual || 0,
    stock_minimo: product.stock_minimo || 2,
    categoria_id: product.categoria_id
  };

  const { data, error } = await supabase
    .from("productos")
    .insert([dbProduct])
    .select("id_codigo_barras")
    .single();

  if (error) throw error;
  return { id: data.id_codigo_barras };
};

export const updateProduct = async (barcode: string, product: Partial<Product>) => {
  const dbProduct = {
    nombre: product.nombre,
    precio_costo: product.costo,
    precio_venta: product.precio,
    stock: product.stock_actual,
    stock_minimo: product.stock_minimo,
    categoria_id: product.categoria_id
  };

  const { error } = await supabase
    .from("productos")
    .update(dbProduct)
    .eq("id_codigo_barras", barcode);

  if (error) throw error;
  return { success: true };
};

export const deleteProduct = async (barcode: string) => {
  // We can try hard delete first, but in case there are related sale_items,
  // we handle constraint errors by soft deleting (or setting barcode references to NULL, which ON DELETE SET NULL does)
  // Let's do a direct delete!
  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id_codigo_barras", barcode);

  if (error) {
    console.error("Error doing hard delete, product might have references:", error);
    throw error;
  }
  return { success: true };
};

// ==========================================
// VENTAS & REPORTES (SALES & REPORTS)
// ==========================================

export const createSale = async (sale: {
  items: SaleItem[];
  total_venta: number;
  ganancia_total: number;
  usuario_id: number;
  metodo_pago: string;
  pago_con?: number;
}) => {
  // 1. Insert into ventas
  const { data: saleData, error: saleError } = await supabase
    .from("ventas")
    .insert([
      {
        total_venta: sale.total_venta,
        ganancia_total: sale.ganancia_total,
        usuario_id: sale.usuario_id,
        cerrado: false,
        metodo_pago: sale.metodo_pago,
        pago_con: sale.pago_con
      }
    ])
    .select("id")
    .single();

  if (saleError) throw saleError;
  const saleId = saleData.id;

  // 2. Loop and process items
  for (const item of sale.items) {
    // A. Insert into venta_items
    const { error: itemError } = await supabase
      .from("venta_items")
      .insert([
        {
          sale_id: saleId,
          product_barcode: String(item.id), // String because primary key is barcode
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }
      ]);

    if (itemError) throw itemError;

    // B. Decrement stock in productos
    // First, fetch current stock
    const { data: prodData, error: fetchError } = await supabase
      .from("productos")
      .select("stock")
      .eq("id_codigo_barras", String(item.id))
      .single();

    if (fetchError) throw fetchError;

    const currentStock = prodData.stock || 0;
    const newStock = Math.max(0, currentStock - item.cantidad);

    const { error: stockError } = await supabase
      .from("productos")
      .update({ stock: newStock })
      .eq("id_codigo_barras", String(item.id));

    if (stockError) throw stockError;
  }

  return { success: true, saleId };
};

export const fetchDailyReport = async (dateStr: string): Promise<DailyReport> => {
  // Fetch closed: false, date matches dateStr
  // We can query sales created on this day
  const { data, error } = await supabase
    .from("ventas")
    .select("total_venta, ganancia_total")
    .eq("cerrado", false);

  if (error) throw error;

  const targetDateStr = new Date(dateStr).toISOString().split('T')[0];
  const dailySales = (data || []).filter((s: any) => {
    return true;
  });

  // Let's implement robust date filtering:
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: filteredData, error: filterError } = await supabase
    .from("ventas")
    .select("total_venta, ganancia_total, metodo_pago")
    .eq("cerrado", false)
    .gte("fecha", startOfDay.toISOString())
    .lte("fecha", endOfDay.toISOString());

  if (filterError) throw filterError;

  const sales = filteredData || [];
  const total_dia = sales.reduce((sum, s) => sum + Number(s.total_venta), 0);
  const ganancia_dia = sales.reduce((sum, s) => sum + Number(s.ganancia_total), 0);
  const ventas_count = sales.length;

  const total_efectivo = sales
    .filter(s => s.metodo_pago === "Efectivo")
    .reduce((sum, s) => sum + Number(s.total_venta), 0);

  const total_bold = sales
    .filter(s => s.metodo_pago === "Bold")
    .reduce((sum, s) => sum + Number(s.total_venta), 0);

  const total_nequi = sales
    .filter(s => s.metodo_pago === "Nequi")
    .reduce((sum, s) => sum + Number(s.total_venta), 0);

  return { 
    total_dia, 
    ganancia_dia, 
    ventas_count,
    total_efectivo,
    total_bold,
    total_nequi
  };
};

export const fetchCalendarData = async (year: number) => {
  const startOfYear = `${year}-01-01T00:00:00.000Z`;
  const endOfYear = `${year}-12-31T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("ventas")
    .select("fecha, total_venta")
    .gte("fecha", startOfYear)
    .lte("fecha", endOfYear);

  if (error) throw error;

  // Group by day and month
  const dailyMap: { [date: string]: number } = {};
  const monthlyMap: { [month: string]: number } = {};

  (data || []).forEach(v => {
    const d = new Date(v.fecha);
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + Number(v.total_venta);

    const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
    monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + Number(v.total_venta);
  });

  const daily = Object.keys(dailyMap).map(date => ({ date, total: dailyMap[date] }));
  const monthly = Object.keys(monthlyMap).map(month => ({ month, total: monthlyMap[month] }));

  return { daily, monthly };
};

export const fetchSoldItems = async (dateStr: string) => {
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch sales on this day
  const { data: sales, error: salesError } = await supabase
    .from("ventas")
    .select("id, metodo_pago")
    .gte("fecha", startOfDay.toISOString())
    .lte("fecha", endOfDay.toISOString());

  if (salesError) throw salesError;
  if (!sales || sales.length === 0) return [];

  const saleIds = sales.map(s => s.id);
  const saleMethodMap = sales.reduce((acc: any, s: any) => {
    acc[s.id] = s.metodo_pago || "Efectivo";
    return acc;
  }, {});

  // 2. Fetch items for these sales
  const { data: items, error: itemsError } = await supabase
    .from("venta_items")
    .select("product_barcode, cantidad, precio_unitario, productos(nombre), sale_id")
    .in("sale_id", saleIds);

  if (itemsError) throw itemsError;

  // Return all raw sold item details
  return (items || []).map(item => ({
    barcode: item.product_barcode,
    nombre: item.productos?.nombre || "Producto eliminado",
    cantidad: Number(item.cantidad),
    precio_unitario: Number(item.precio_unitario),
    total_venta: Number(item.cantidad) * Number(item.precio_unitario),
    metodo_pago: saleMethodMap[item.sale_id] || "Efectivo"
  }));
};

export const closeDay = async () => {
  const today = new Date().toISOString().split('T')[0];
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const { error } = await supabase
    .from("ventas")
    .update({ cerrado: true })
    .gte("fecha", startOfDay)
    .lte("fecha", endOfDay)
    .eq("cerrado", false);

  if (error) throw error;
  return { success: true };
};

// ==========================================
// APARTADOS (APARTMENTS/LAYAWAYS)
// ==========================================

export const fetchApartados = async (): Promise<Apartado[]> => {
  const { data, error } = await supabase
    .from("apartados")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    cliente_nombre: a.cliente_nombre,
    descripcion: a.descripcion || "",
    total: Number(a.total),
    abono: Number(a.abono),
    estado: a.estado as "Pendiente" | "Entregado",
    fecha_entrega: a.fecha_entrega || "",
    creado_en: a.creado_en || ""
  }));
};

export const createApartado = async (apartado: Partial<Apartado>) => {
  const { data, error } = await supabase
    .from("apartados")
    .insert([
      {
        cliente_nombre: apartado.cliente_nombre,
        descripcion: apartado.descripcion,
        total: apartado.total,
        abono: apartado.abono,
        estado: apartado.estado || "Pendiente",
        fecha_entrega: apartado.fecha_entrega
      }
    ])
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
};

export const updateApartado = async (id: number, updates: Partial<Apartado>) => {
  const dbUpdates: any = {};
  if (updates.cliente_nombre !== undefined) dbUpdates.cliente_nombre = updates.cliente_nombre;
  if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
  if (updates.total !== undefined) dbUpdates.total = updates.total;
  if (updates.abono !== undefined) dbUpdates.abono = updates.abono;
  if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
  if (updates.fecha_entrega !== undefined) dbUpdates.fecha_entrega = updates.fecha_entrega;

  const { error } = await supabase
    .from("apartados")
    .update(dbUpdates)
    .eq("id", id);

  if (error) throw error;
  return { success: true };
};

export const deleteApartado = async (id: number) => {
  const { error } = await supabase
    .from("apartados")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
};
