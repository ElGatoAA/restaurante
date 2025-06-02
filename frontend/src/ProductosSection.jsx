import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProductosSection() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formData, setFormData] = useState({ id: '', nombre: '', descripcion: '', precio: '', categoria_id: '' });

  const API = {
    productos: 'http://localhost:3001/productos',
    categorias: 'http://localhost:3001/categorias'
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
      setProductos(resProd.data);
      setCategorias(resCat.data.filter(c => c.activo));
    } catch (err) {
      console.error('Error al cargar productos o categorías:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`${API.productos}/${formData.id}`, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: parseFloat(formData.precio),
          categoria_id: parseInt(formData.categoria_id)
        });
      } else {
        await axios.post(API.productos, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: parseFloat(formData.precio),
          categoria_id: parseInt(formData.categoria_id)
        });
      }
      setFormData({ id: '', nombre: '', descripcion: '', precio: '', categoria_id: '' });
      cargarDatos();
    } catch (err) {
      console.error('Error al guardar producto:', err);
    }
  };

  const handleEdit = (producto) => {
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio.toString(),
      categoria_id: producto.categoria_id.toString()
    });
  };

  const eliminarProducto = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await axios.delete(`${API.productos}/${id}`);
      cargarDatos();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
    }
  };

  return (
    <section>
      <h2>Gestión de Productos</h2>

      <div className="form-container">
        <h3>{formData.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
        <form onSubmit={handleSubmit}>
          <label>Nombre:</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            required
          />
          <label>Descripción:</label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
          />
          <label>Precio:</label>
          <input
            type="number"
            step="0.01"
            value={formData.precio}
            onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
            required
          />
          <label>Categoría:</label>
          <select
            value={formData.categoria_id}
            onChange={(e) => setFormData(prev => ({ ...prev, categoria_id: e.target.value }))}
            required
          >
            <option value="">Seleccionar categoría</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setFormData({ id: '', nombre: '', descripcion: '', precio: '', categoria_id: '' })}>
            Cancelar
          </button>
        </form>
      </div>

      <div>
        <h3>Lista de Productos</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(prod => {
              const categoria = categorias.find(c => c.id === prod.categoria_id);
              return (
                <tr key={prod.id}>
                  <td>{prod.id}</td>
                  <td>{prod.nombre}</td>
                  <td>{categoria ? categoria.nombre : 'Sin categoría'}</td>
                  <td>${Number(prod.precio).toFixed(2)}</td>
                  <td>
                    <button onClick={() => handleEdit(prod)}>Editar</button>
                    <button onClick={() => eliminarProducto(prod.id)}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ProductosSection;