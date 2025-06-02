import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CategoriasSection() {
  const [categorias, setCategorias] = useState([]);
  const [formData, setFormData] = useState({ id: '', nombre: '', descripcion: '' });

  const API_URL = 'http://localhost:3001/categorias';

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const res = await axios.get(API_URL);
      setCategorias(res.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`${API_URL}/${formData.id}`, {
          nombre: formData.nombre,
          descripcion: formData.descripcion
        });
      } else {
        await axios.post(API_URL, {
          nombre: formData.nombre,
          descripcion: formData.descripcion
        });
      }
      setFormData({ id: '', nombre: '', descripcion: '' });
      fetchCategorias();
    } catch (err) {
      console.error('Error al guardar categoría:', err);
    }
  };

  const handleEdit = (categoria) => {
    setFormData({
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
  };

  const eliminarCategoria = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchCategorias();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
    }
  };

  return (
    <section>
      <h2>Gestión de Categorías</h2>

      <div className="form-container">
        <h3>{formData.id ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
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
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setFormData({ id: '', nombre: '', descripcion: '' })}>
            Cancelar
          </button>
        </form>
      </div>

      <div>
        <h3>Lista de Categorías</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map(cat => (
              <tr key={cat.id}>
                <td>{cat.id}</td>
                <td>{cat.nombre}</td>
                <td>{cat.descripcion || ''}</td>
                <td>
                  <button onClick={() => handleEdit(cat)}>Editar</button>
                  <button onClick={() => eliminarCategoria(cat.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CategoriasSection;