import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CategoriasSection from './CategoriasSection';
import ProductosSection from './ProductosSection';
import OrdenesSection from './OrdenesSection';
import ListaOrdenesSection from './ListaOrdenesSection';
import VentasSection from './VentasSection';
import Auth from './Auth';

function App() {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const nombreGuardado = localStorage.getItem('usuarioNombre');
    if (nombreGuardado) {
      setUsuario(nombreGuardado);
    }
  }, []);

  const handleLogin = (nombre) => {
    setUsuario(nombre);
    localStorage.setItem('usuarioNombre', nombre);
    navigate('/ordenes');
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('usuarioNombre');
    localStorage.removeItem('token');
    navigate('/');
  };

  if (!usuario) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div>
      <header style={{ marginBottom: '20px' }}>
        <h1>Sistema Restaurant</h1>
        <p>Bienvenido, {usuario}</p>
        <nav style={{ marginBottom: '20px' }}>
          {usuario === 'admin' && (
            <>
              <button className={`nav-button`} onClick={() => navigate('/categorias')}>Categorías</button>
              <button className={`nav-button`} onClick={() => navigate('/productos')}>Productos</button>
              <button className={`nav-button`} onClick={() => navigate('/ventas')}>Corte de Ventas</button>
            </>
          )}
          <button className={`nav-button`} onClick={() => navigate('/ordenes')}>Crear Orden</button>
          <button className={`nav-button`} onClick={() => navigate('/lista-ordenes')}>Ver Órdenes</button>
          <button className="nav-button btn-danger" onClick={handleLogout} style={{ marginLeft: 'auto' }}>
            Cerrar sesión
          </button>
        </nav>
      </header>

      <main>
        <Routes>
          {usuario === 'admin' && <Route path="/categorias" element={<CategoriasSection />} />}
          {usuario === 'admin' && <Route path="/productos" element={<ProductosSection />} />}
          <Route path="/ordenes" element={<OrdenesSection />} />
          <Route path="/lista-ordenes" element={<ListaOrdenesSection />} />
          {usuario === 'admin' && <Route path="/ventas" element={<VentasSection />} />}
          <Route path="*" element={<Navigate to="/ordenes" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
