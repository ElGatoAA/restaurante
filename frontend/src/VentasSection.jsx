import React, { useState, useEffect } from 'react';
import axios from 'axios';

function VentasSection() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [reporte, setReporte] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const API = {
    ventas: 'http://localhost:3001/ventas',
    corte: 'http://localhost:3001/ventas/corte'
  };

  useEffect(() => {
    const hoy = new Date();
    const fechaFormateada = hoy.toISOString().split('T')[0];
    setFechaInicio(fechaFormateada);
    setFechaFin(fechaFormateada);
  }, []);

  const generarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    try {
      const res = await axios.get(`${API.ventas}?desde=${fechaInicio}&hasta=${fechaFin}`);
      setReporte(res.data);
    } catch (err) {
      console.error('Error al generar reporte:', err);
      alert('Error al generar el reporte');
    }
  };

  const confirmarCorte = () => {
    if (!reporte || reporte.totalOrdenes === 0) {
      alert('No hay datos de ventas para realizar el corte');
      return;
    }
    setMostrarConfirmacion(true);
  };

  const ejecutarCorte = async () => {
    try {
      await axios.post(API.corte);
      setMostrarConfirmacion(false);
      alert('Corte realizado exitosamente');
      setReporte(null);
    } catch (err) {
      console.error('Error al realizar corte:', err);
      alert('Error al realizar el corte');
    }
  };

  const cancelarCorte = () => {
    setMostrarConfirmacion(false);
  };

  return (
    <section>
      <h2>Corte de Ventas</h2>

      <div className="sales-filters">
        <label>Fecha Inicio:</label>
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
        <label>Fecha Fin:</label>
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
        />
        <button onClick={generarReporte} className="btn-success">
          Generar Reporte
        </button>
      </div>

      {reporte && (
        <div className="sales-report">
          <h3>Reporte de Ventas</h3>

          <div className="resumen-destacado">
            <h4>Resumen General</h4>
            <p><strong>Período:</strong> {reporte.fechaInicio} - {reporte.fechaFin}</p>
            <p><strong>Total de Órdenes Completadas:</strong> {reporte.totalOrdenes}</p>
            <p><strong>Total de Ventas:</strong> ${reporte.totalVentas.toFixed(2)}</p>
            <p><strong>Promedio por Orden:</strong> ${reporte.promedio.toFixed(2)}</p>
          </div>

          <div>
            <h4>Productos Más Vendidos</h4>
            {reporte.productosVendidos.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad Vendida</th>
                    <th>Total Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.productosVendidos.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nombre}</td>
                      <td>{item.cantidad}</td>
                      <td>${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No se encontraron productos vendidos en el período seleccionado.</p>
            )}
          </div>

          <div style={{ marginTop: '30px' }}>
            <h4>Realizar Corte de Caja</h4>
            <p><strong>Atención:</strong> El corte de caja eliminará todas las órdenes del sistema y reiniciará el conteo.</p>
            <button 
              onClick={confirmarCorte} 
              className="btn-danger"
              style={{ padding: '15px 30px', fontSize: '16px' }}
            >
              Realizar Corte de Caja
            </button>
          </div>
        </div>
      )}

      {mostrarConfirmacion && (
        <div className="corte-warning">
          <h4>⚠️ Confirmación de Corte de Caja</h4>
          <p><strong>¿Estás seguro de que deseas realizar el corte de caja?</strong></p>
          <p>Esta acción:</p>
          <ul>
            <li>Eliminará TODAS las órdenes del sistema ({reporte?.totalOrdenes || 0} órdenes)</li>
            <li>Reiniciará el conteo de órdenes</li>
            <li>NO se puede deshacer</li>
          </ul>
          <p><strong>Resumen del período a cerrar:</strong></p>
          <ul>
            <li>Fecha: {reporte?.fechaInicio} - {reporte?.fechaFin}</li>
            <li>Órdenes completadas: {reporte?.totalOrdenes}</li>
            <li>Total de ventas: ${reporte?.totalVentas.toFixed(2)}</li>
          </ul>

          <div className="corte-actions">
            <button onClick={ejecutarCorte} className="btn-danger">SÍ, Realizar Corte</button>
            <button onClick={cancelarCorte} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default VentasSection;