import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ListaOrdenesSection() {
  const [ordenes, setOrdenes] = useState([]);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [usuario, setUsuario] = useState('');
  const navigate = useNavigate();
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
      <h3>Lista de Órdenes</h3>

      <div className="orders-filters">
        <div>
          <label>Filtrar por estado:</label>
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div>
          <label>Filtrar por fecha:</label>
          <input type="date" value={fechaFilter} onChange={e => setFechaFilter(e.target.value)} />
        </div>

        <button className="btn-secondary" onClick={limpiarFiltros}>Limpiar Filtros</button>
      </div>

      {ordenesFiltradas.length === 0 ? (
        <p>No se encontraron órdenes con los filtros aplicados.</p>
      ) : (
        ordenesFiltradas.map(orden => {
          const totalCalculado = orden.items?.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
          return (
            <div key={orden.id} className="order-card">
              <h4>Orden #{orden.numero_orden}</h4>
              <p><strong>Mesero:</strong> {orden.cliente_nombre || 'Sin nombre'}</p>
              <p><strong>Mesa:</strong> {orden.mesa || 'Sin mesa'}</p>
              <p><strong>Fecha:</strong> {new Date(orden.fecha_creacion).toLocaleString()}</p>
              <p>
                <strong>Estado:</strong>{' '}
                <span className={`estado-${orden.estado}`}>{orden.estado.toUpperCase()}</span>
              </p>

              <div className="order-items-detail">
                <strong>Productos:</strong>
                <ul>
                  {orden.items?.map((item, index) => (
                    <li key={index}>
                      {item.nombre || item.nombre_producto} x{item.cantidad} — ${Number(item.subtotal || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-total">Total: ${totalCalculado.toFixed(2)}</div>

              <div className="order-actions">
                {usuario === 'admin' && (
                  <>
                    <button
                      className="btn-warning"
                      onClick={() => cambiarEstado(orden.id, 'pendiente')}
                      disabled={orden.estado === 'pendiente'}
                    >
                      Pendiente
                    </button>
                    <button
                      className="btn-success"
                      onClick={() => cambiarEstado(orden.id, 'completada')}
                      disabled={orden.estado === 'completada'}
                    >
                      Completar
                    </button>
                    <button className="btn-danger" onClick={() => eliminarOrden(orden.id)}>
                      Cancelar
                    </button>
                  </>
                )}
                <button onClick={() => navigate('/ordenes', { state: { orden } })}>
                  Editar
                </button>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

export default ListaOrdenesSection;
