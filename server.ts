import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("fotos_y_fiestas.db");
db.pragma("journal_mode = WAL");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    pin_acceso TEXT NOT NULL,
    activo BOOLEAN DEFAULT 1,
    foto_perfil TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_categoria TEXT NOT NULL UNIQUE,
    descripcion TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    costo REAL DEFAULT 0,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 2,
    categoria_id INTEGER,
    barcode TEXT UNIQUE,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categories(id)
  );
`);

// Robust schema updates for existing tables
const addColumn = (table: string, column: string, type: string) => {
  try {
    // Check if column exists first to avoid unnecessary error logging
    const info = db.pragma(`table_info(${table})`) as any[];
    if (!info.some(col => col.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`Successfully added column ${column} to ${table}`);
    }
  } catch (e: any) {
    console.warn(`Error ensuring column ${column} in ${table}: ${e.message}`);
  }
};

addColumn("products", "barcode", "TEXT");
addColumn("products", "activo", "BOOLEAN DEFAULT 1");
addColumn("products", "costo", "REAL DEFAULT 0");
addColumn("products", "stock_minimo", "INTEGER DEFAULT 2");
addColumn("sales", "cerrado", "BOOLEAN DEFAULT 0");
addColumn("users", "foto_perfil", "TEXT");

// Create index separately for barcode if it doesn't exist
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_barcode ON products(barcode) WHERE barcode IS NOT NULL;");
} catch (e) {
  console.warn("Could not create barcode index:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
    total_venta REAL NOT NULL,
    ganancia_total REAL NOT NULL,
    usuario_id INTEGER,
    cerrado BOOLEAN DEFAULT 0,
    FOREIGN KEY (usuario_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    cantidad INTEGER,
    precio_unitario REAL,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS apartados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nombre TEXT NOT NULL,
    descripcion TEXT,
    total REAL NOT NULL,
    abono REAL DEFAULT 0,
    estado TEXT DEFAULT 'Pendiente',
    fecha_entrega TEXT,
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed initial data if empty
  INSERT OR IGNORE INTO users (nombre, pin_acceso) VALUES ('Admin', '1234');
  INSERT OR IGNORE INTO categories (nombre_categoria) VALUES ('Globos'), ('Velas'), ('Piñatas'), ('Desechables');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth (Simple PIN)
  app.post("/api/login", (req, res) => {
    const { pin } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE pin_acceso = ? AND activo = 1").get(pin);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "PIN incorrecto" });
    }
  });

  // Products
  app.get("/api/products/barcode/:barcode", (req, res) => {
    const { barcode } = req.params;
    const product = db.prepare(`
      SELECT p.*, c.nombre_categoria 
      FROM products p 
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE p.barcode = ? AND p.activo = 1
    `).get(barcode);
    
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ success: false, message: "Producto no encontrado" });
    }
  });

  app.get("/api/products", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.nombre_categoria 
      FROM products p 
      LEFT JOIN categories c ON p.categoria_id = c.id
      WHERE p.activo = 1
    `).all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { nombre, precio, stock_actual, stock_minimo, categoria_id, costo, barcode } = req.body;
    const info = db.prepare(`
      INSERT INTO products (nombre, precio, stock_actual, stock_minimo, categoria_id, costo, barcode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nombre, precio, stock_actual, stock_minimo, categoria_id, costo || 0, barcode || null);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { nombre, precio, stock_actual, stock_minimo, categoria_id, costo, barcode } = req.body;
    db.prepare(`
      UPDATE products 
      SET nombre = ?, precio = ?, stock_actual = ?, stock_minimo = ?, categoria_id = ?, costo = ?, barcode = ?
      WHERE id = ?
    `).run(nombre, precio, stock_actual, stock_minimo, categoria_id, costo, barcode || null, id);
    res.json({ success: true });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    try {
      // Try hard delete first (only works if no sales exist)
      db.prepare("DELETE FROM products WHERE id = ?").run(id);
    } catch (e) {
      // If sales exist, soft delete instead to preserve history
      db.prepare("UPDATE products SET activo = 0, barcode = NULL WHERE id = ?").run(id);
    }
    res.json({ success: true });
  });

  // Categories
  app.get("/api/categories", (req, res) => {
    res.json(db.prepare("SELECT * FROM categories").all());
  });

  app.post("/api/categories", (req, res) => {
    const { nombre_categoria, descripcion } = req.body;
    const info = db.prepare("INSERT INTO categories (nombre_categoria, descripcion) VALUES (?, ?)")
      .run(nombre_categoria, descripcion || null);
    res.json({ id: info.lastInsertRowid });
  });

  // Sales
  app.post("/api/sales", (req, res) => {
    const { items, total_venta, ganancia_total, usuario_id } = req.body;
    
    const transaction = db.transaction(() => {
      const saleInfo = db.prepare(`
        INSERT INTO sales (total_venta, ganancia_total, usuario_id)
        VALUES (?, ?, ?)
      `).run(total_venta, ganancia_total, usuario_id);
      
      const saleId = saleInfo.lastInsertRowid;
      
      for (const item of items) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?)
        `).run(saleId, item.id, item.cantidad, item.precio);
        
        db.prepare(`
          UPDATE products SET stock_actual = stock_actual - ? WHERE id = ?
        `).run(item.cantidad, item.id);
      }
      
      return saleId;
    });

    try {
      const saleId = transaction();
      res.json({ success: true, saleId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error al procesar venta" });
    }
  });

  app.get("/api/reports/daily", (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const report = db.prepare(`
      SELECT SUM(total_venta) as total_dia, SUM(ganancia_total) as ganancia_dia, COUNT(*) as ventas_count
      FROM sales
      WHERE date(fecha) = date(?) AND cerrado = 0
    `).get(date);
    res.json(report || { total_dia: 0, ganancia_dia: 0, ventas_count: 0 });
  });

  app.get("/api/reports/calendar", (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const stats = db.prepare(`
      SELECT date(fecha) as date, SUM(total_venta) as total
      FROM sales
      WHERE strftime('%Y', fecha) = ?
      GROUP BY date(fecha)
    `).all(String(year));
    
    const monthlyStats = db.prepare(`
      SELECT strftime('%m', fecha) as month, SUM(total_venta) as total
      FROM sales
      WHERE strftime('%Y', fecha) = ?
      GROUP BY month
    `).all(String(year));

    res.json({ daily: stats, monthly: monthlyStats });
  });

  app.get("/api/reports/sold-items", (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const items = db.prepare(`
      SELECT 
        p.nombre,
        SUM(si.cantidad) as total_cantidad,
        SUM(si.cantidad * si.precio_unitario) as total_venta
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE date(s.fecha) = date(?)
      GROUP BY p.id
      ORDER BY total_cantidad DESC
    `).all(date);
    res.json(items);
  });

  app.post("/api/reports/close-day", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Mark today's sales as closed instead of deleting them
      db.prepare("UPDATE sales SET cerrado = 1 WHERE date(fecha) = ? AND cerrado = 0").run(today);
      res.json({ success: true, message: "Día cerrado y contadores reiniciados a 0" });
    } catch (error) {
      console.error("Error closing day:", error);
      res.status(500).json({ error: "No se pudo cerrar el día" });
    }
  });

  // Apartados
  app.get("/api/apartados", (req, res) => {
    res.json(db.prepare("SELECT * FROM apartados ORDER BY creado_en DESC").all());
  });

  app.post("/api/apartados", (req, res) => {
    const { cliente_nombre, descripcion, total, abono, fecha_entrega } = req.body;
    const info = db.prepare(`
      INSERT INTO apartados (cliente_nombre, descripcion, total, abono, fecha_entrega)
      VALUES (?, ?, ?, ?, ?)
    `).run(cliente_nombre, descripcion, total, abono, fecha_entrega);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/apartados/:id", (req, res) => {
    const { id } = req.params;
    const { cliente_nombre, descripcion, total, abono, estado, fecha_entrega } = req.body;
    
    if (cliente_nombre !== undefined) {
      db.prepare(`
        UPDATE apartados 
        SET cliente_nombre = ?, descripcion = ?, total = ?, abono = ?, estado = ?, fecha_entrega = ? 
        WHERE id = ?
      `).run(cliente_nombre, descripcion, total, abono, estado, fecha_entrega, id);
    } else {
      db.prepare(`UPDATE apartados SET abono = ?, estado = ? WHERE id = ?`).run(abono, estado, id);
    }
    
    res.json({ success: true });
  });

  app.delete("/api/apartados/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM apartados WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/users", (req, res) => {
    res.json(db.prepare("SELECT id, nombre, activo, foto_perfil FROM users").all());
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { activo, nombre, foto_perfil } = req.body;
    
    if (nombre !== undefined || foto_perfil !== undefined) {
      db.prepare("UPDATE users SET nombre = COALESCE(?, nombre), foto_perfil = COALESCE(?, foto_perfil) WHERE id = ?")
        .run(nombre, foto_perfil, id);
    }
    
    if (activo !== undefined) {
      db.prepare("UPDATE users SET activo = ? WHERE id = ?").run(activo ? 1 : 0, id);
    }
    
    res.json({ success: true, user: db.prepare("SELECT id, nombre, activo, foto_perfil FROM users WHERE id = ?").get(id) });
  });

  // --- Vite / Static ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
