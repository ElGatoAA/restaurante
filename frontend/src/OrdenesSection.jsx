import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OrdenesSection() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mesa, setMesa] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [ordenActual, setOrdenActual] = useState({ items: [], total: 0 });
  const [cantidades, setCantidades] = useState({});

  const API = {
    productos: 'http://localhost:3001/productos',
    categorias: 'http://localhost:3001/categorias',
    ordenes: 'http://localhost:3001/ordenes'
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        axios.get(API.productos),
        axios.get(API.categorias)
      ]);
      setProductos(resProd.data.filter(p => p.activo));
      setCategorias(resCat.data.filter(c => c.activo));
    } catch (err) {
      console.error('Error al cargar productos o categorías:', err);
    }
  };

  const productosFiltrados = productos.filter(p => {
    return categoriaFilter === '' || p.categoria_id == categoriaFilter;
  });

  const agregarProducto = (productoId) => {
    const cantidad = cantidades[productoId] || 1;
    const producto = productos.find(p => p.id === productoId);

    setOrdenActual(prev => {
      const existente = prev.items.find(i => i.producto_id === productoId);
      let nuevosItems;

      if (existente) {
        nuevosItems = prev.items.map(i =>
          i.producto_id === productoId
            ? {
                ...i,
                cantidad: i.cantidad + cantidad,
                subtotal: (i.cantidad + cantidad) * i.precio_unitario
              }
            : i
        );
      } else {
        nuevosItems = [...prev.items, {
          producto_id: productoId,
          nombre: producto.nombre,
          precio_unitario: producto.precio,
          cantidad,
          subtotal: producto.precio * cantidad
        }];
      }

      const nuevoTotal = nuevosItems.reduce((sum, i) => sum + i.subtotal, 0);
      return { items: nuevosItems, total: nuevoTotal };
    });

    setCantidades(prev => ({ ...prev, [productoId]: 1 }));
  };

  const removerItem = (index) => {
    setOrdenActual(prev => {
      const nuevosItems = prev.items.filter((_, i) => i !== index);
      const nuevoTotal = nuevosItems.reduce((sum, i) => sum + i.subtotal, 0);
      return { items: nuevosItems, total: nuevoTotal };
    });
  };

  const guardarOrden = async () => {
    if (ordenActual.items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    try {
      await axios.post(API.ordenes, {
        mesa,
        items: ordenActual.items
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      alert('Orden guardada exitosamente');
      limpiarOrden();
    } catch (err) {
      console.error('Error al guardar orden:', err);
      alert('Error al guardar la orden');
    }
  };

  const limpiarOrden = () => {
    setMesa('');
    setOrdenActual({ items: [], total: 0 });
    setCantidades({});
  };

  return (
    <section>
      <h2>Crear Nueva Orden</h2>

      <div className="form-container">
        <label>Mesa:</label>
        <input value={mesa} onChange={(e) => setMesa(e.target.value)} />

        <label>Filtrar por categoría:</label>
        <select value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)}>
          <option value="">Todas</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
          ))}
        </select>
      </div>

      <div className="products-grid">
        {productosFiltrados.map(prod => (
          <div key={prod.id} className="product-card">
            <h4>{prod.nombre}</h4>
            <p>{prod.descripcion}</p>
            <p><strong>${Number(prod.precio).toFixed(2)}</strong></p>
            <div className="product-controls">
              <input
                type="number"
                min="1"
                value={cantidades[prod.id] || 1}
                onChange={(e) => setCantidades(prev => ({
                  ...prev,
                  [prod.id]: parseInt(e.target.value) || 1
                }))}
              />
              <button onClick={() => agregarProducto(prod.id)}>Agregar</button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4>Productos en la Orden</h4>
        {ordenActual.items.map((item, index) => (
          <div key={index} style={{ margin: '10px 0' }}>
            {item.nombre} x{item.cantidad} = ${item.subtotal.toFixed(2)}
            <button onClick={() => removerItem(index)} style={{ marginLeft: '10px' }}>Eliminar</button>
          </div>
        ))}

        <div className="order-total">
          Total: ${ordenActual.total.toFixed(2)}
        </div>

        <button onClick={guardarOrden} style={{ marginRight: '10px' }}>Guardar Orden</button>
        <button onClick={limpiarOrden}>Limpiar</button>
      </div>
    </section>
  );
}

export default OrdenesSection;