import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ListaOrdenesSection() {
  const [ordenes, setOrdenes] = useState([]);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [usuario, setUsuario] = useState('');

  const API_URL = 'http://localhost:3001/ordenes';

  useEffect(() => {
    setUsuario(localStorage.getItem('usuarioNombre') || '');
    fetchOrdenes();
  }, []);

  const fetchOrdenes = async () => {
    try {
      const res = await axios.get(API_URL);
      setOrdenes(res.data);
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
    }
  };

  const limpiarFiltros = () => {
    setEstadoFilter('');
    setFechaFilter('');
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await axios.put(`${API_URL}/${id}`, { estado: nuevoEstado });
      fetchOrdenes();
    } catch (err) {
      console.error('Error al cambiar estado de orden:', err);
    }
  };

  const eliminarOrden = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta orden?')) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchOrdenes();
    } catch (err) {
      console.error('Error al eliminar orden:', err);
    }
  };

  let ordenesFiltradas = ordenes;

  if (estadoFilter) {
    ordenesFiltradas = ordenesFiltradas.filter(o => o.estado === estadoFilter);
  }

  if (fechaFilter) {
    const fechaSeleccionada = new Date(fechaFilter);
    ordenesFiltradas = ordenesFiltradas.filter(o => {
      const fechaOrden = new Date(o.fecha_creacion);
      return fechaOrden.toDateString() === fechaSeleccionada.toDateString();
    });
  }

  return (
    <section>
      <h2>Lista de Órdenes</h2>

      <div className="orders-filters">
        <label>Filtrar por estado:</label>
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <label>Filtrar por fecha:</label>
        <input
          type="date"
          value={fechaFilter}
          onChange={(e) => setFechaFilter(e.target.value)}
        />
        <button onClick={limpiarFiltros}>Limpiar Filtros</button>
      </div>

      <div>
        {ordenesFiltradas.length === 0 ? (
          <p>No se encontraron órdenes con los filtros aplicados.</p>
        ) : (
          ordenesFiltradas.map(orden => {
            const totalCalculado = orden.items?.reduce(
              (sum, item) => sum + Number(item.subtotal || 0),
              0
            );

            return (
              <div key={orden.id} className="order-card">
                <h4>Orden {orden.numero_orden}</h4>
                <p><strong>Mesero:</strong> {orden.cliente_nombre || 'Sin nombre'}</p>
                <p><strong>Mesa:</strong> {orden.mesa || 'Sin mesa'}</p>
                <p><strong>Fecha:</strong> {new Date(orden.fecha_creacion).toLocaleString()}</p>
                <p><strong>Estado:</strong> <span className={`estado-${orden.estado}`}>{orden.estado.toUpperCase()}</span></p>

                <div className="order-items-detail">
                  <strong>Productos:</strong>
                  <ul>
                    {orden.items?.map((item, index) => (
                      <li key={index}>
                        {item.nombre || item.nombre_producto} x{item.cantidad} - ${Number(item.subtotal || 0).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <p><strong>Total: ${totalCalculado.toFixed(2)}</strong></p>

                {usuario === 'admin' && (
                  <div className="order-actions">
                    <button
                      onClick={() => cambiarEstado(orden.id, 'pendiente')}
                      disabled={orden.estado === 'pendiente'}
                    >
                      Pendiente
                    </button>
                    <button
                      onClick={() => cambiarEstado(orden.id, 'completada')}
                      disabled={orden.estado === 'completada'}
                    >
                      Completar
                    </button>
                    <button
                      onClick={() => eliminarOrden(orden.id)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                <hr />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default ListaOrdenesSection;
