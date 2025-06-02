const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET = 'clave_super_secreta'; // cámbiala por una más segura

app.use(cors());
app.use(express.json());

// Middleware para verificar token
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// ==================== AUTENTICACIÓN ====================

app.post('/auth/register', async (req, res) => {
  const { nombre, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, password_hash) VALUES ($1, $2) RETURNING id, nombre',
      [nombre, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { nombre, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, nombre: user.nombre }, SECRET, { expiresIn: '1d' });
    res.json({ token, nombre: user.nombre });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// ==================== CATEGORÍAS ====================

app.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

app.post('/categorias', async (req, res) => {
  const { nombre, descripcion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

app.put('/categorias/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  try {
    const result = await pool.query(
      'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
      [nombre, descripcion, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

app.delete('/categorias/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

// ==================== PRODUCTOS ====================

app.get('/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/productos', async (req, res) => {
  const { nombre, descripcion, precio, categoria_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, descripcion, precio, categoria_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

app.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, categoria_id = $4 WHERE id = $5 RETURNING *',
      [nombre, descripcion, precio, categoria_id, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.delete('/productos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ==================== ÓRDENES ====================

app.get('/ordenes', async (req, res) => {
  try {
    const ordenesRes = await pool.query('SELECT * FROM ordenes ORDER BY id');
    const ordenes = ordenesRes.rows;

    for (const orden of ordenes) {
      const itemsRes = await pool.query(
        'SELECT producto_id, nombre_producto AS nombre, precio_unitario, cantidad, subtotal FROM orden_items WHERE orden_id = $1',
        [orden.id]
      );
      orden.items = itemsRes.rows;
    }

    res.json(ordenes);
  } catch (err) {
    console.error('Error al obtener órdenes:', err);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
});



app.post('/ordenes', verificarToken, async (req, res) => {
  const { mesa, items } = req.body;
  const cliente_nombre = req.usuario.nombre;

  try {
    const orden = await pool.query(
      'INSERT INTO ordenes (cliente_nombre, mesa, estado) VALUES ($1, $2, $3) RETURNING *',
      [cliente_nombre, mesa, 'pendiente']
    );
    const ordenId = orden.rows[0].id;

    for (const item of items) {
      await pool.query(
        'INSERT INTO orden_items (orden_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
        [ordenId, item.producto_id, item.nombre, item.precio_unitario, item.cantidad, item.subtotal]
      );
    }

    res.status(201).json(orden.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear orden' });
  }
});

app.put('/ordenes/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE ordenes SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado de orden' });
  }
});

app.delete('/ordenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM orden_items WHERE orden_id = $1', [id]);
    await pool.query('DELETE FROM ordenes WHERE id = $1', [id]);
    res.json({ mensaje: 'Orden eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

// ==================== VENTAS ====================

app.get('/ventas', async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    // Obtener órdenes completadas en el rango de fechas
    const ordenesRes = await pool.query(`
      SELECT id, fecha_creacion FROM ordenes
      WHERE estado = 'completada'
      AND fecha_creacion BETWEEN $1 AND $2
    `, [desde, hasta]);

    const ordenes = ordenesRes.rows;

    // Calcular totales por orden sumando subtotales de sus productos
    for (const orden of ordenes) {
      const itemsRes = await pool.query(
        'SELECT subtotal FROM orden_items WHERE orden_id = $1',
        [orden.id]
      );
      orden.total = itemsRes.rows.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);
    }

    const totalVentas = ordenes.reduce((sum, o) => sum + o.total, 0);
    const promedio = ordenes.length > 0 ? totalVentas / ordenes.length : 0;

    res.json({
      fechaInicio: desde,
      fechaFin: hasta,
      totalOrdenes: ordenes.length,
      totalVentas,
      totalSubtotal: totalVentas,
      totalImpuestos: 0,
      promedio,
      productosVendidos: [] // puedes implementar esto después si lo deseas
    });
  } catch (err) {
    console.error('Error al generar reporte de ventas:', err);
    res.status(500).json({ error: 'Error al generar reporte de ventas' });
  }
});

app.post('/ventas/corte', async (req, res) => {
  try {
    await pool.query("DELETE FROM ordenes WHERE estado = 'completada'");
    res.json({ mensaje: 'Corte realizado exitosamente' });
  } catch (err) {
    console.error('Error al realizar corte:', err);
    res.status(500).json({ error: 'Error al realizar corte de caja' });
  }
});

// ==================== 404 ====================
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});

