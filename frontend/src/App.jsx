import React, { useState, useEffect } from 'react';
import CategoriasSection from './CategoriasSection';
import ProductosSection from './ProductosSection';
import OrdenesSection from './OrdenesSection';
import ListaOrdenesSection from './ListaOrdenesSection';
import VentasSection from './VentasSection';
import Auth from './Auth';

export default function App() {
  const [activeSection, setActiveSection] = useState('ordenes');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const nombreGuardado = localStorage.getItem('usuarioNombre');
    if (nombreGuardado) {
      setUsuario(nombreGuardado);
    }
  }, []);

  const handleLogin = (nombre) => {
    setUsuario(nombre);
    localStorage.setItem('usuarioNombre', nombre);
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('usuarioNombre');
    localStorage.removeItem('token');
  };

  if (!usuario) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderNavigation = () => (
    <nav style={{ marginBottom: '20px' }}>
      {usuario === 'admin' && (
        <>
          <button
            className={`nav-button ${activeSection === 'categorias' ? 'active' : ''}`}
            onClick={() => setActiveSection('categorias')}
          >
            Categorías
          </button>
          <button
            className={`nav-button ${activeSection === 'productos' ? 'active' : ''}`}
            onClick={() => setActiveSection('productos')}
          >
            Productos
          </button>
          <button
            className={`nav-button ${activeSection === 'ventas' ? 'active' : ''}`}
            onClick={() => setActiveSection('ventas')}
          >
            Corte de Ventas
        </button>
        </>
      )}

      <button
        className={`nav-button ${activeSection === 'ordenes' ? 'active' : ''}`}
        onClick={() => setActiveSection('ordenes')}
      >
        Crear Orden
      </button>
      <button
        className={`nav-button ${activeSection === 'lista-ordenes' ? 'active' : ''}`}
        onClick={() => setActiveSection('lista-ordenes')}
      >
        Ver Órdenes
      </button>

      <button onClick={handleLogout} style={{ float: 'right' }}>Cerrar sesión</button>
    </nav>
  );

  return (
    <div>
      <header style={{ marginBottom: '20px' }}>
        <h1>Sistema Restaurant</h1>
        <p>Bienvenido, {usuario}</p>
        {renderNavigation()}
      </header>

      <main>
        {usuario === 'admin' && activeSection === 'categorias' && <CategoriasSection />}
        {usuario === 'admin' && activeSection === 'productos' && <ProductosSection />}
        {activeSection === 'ordenes' && <OrdenesSection />}
        {activeSection === 'lista-ordenes' && <ListaOrdenesSection />}
        {activeSection === 'ventas' && <VentasSection />}
      </main>
    </div>
  );
}