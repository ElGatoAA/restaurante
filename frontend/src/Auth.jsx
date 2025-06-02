import React, { useState } from 'react';
import axios from 'axios';

function Auth({ onLogin }) {
  const [modo, setModo] = useState('login'); // 'login' o 'register'
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';

    try {
      const res = await axios.post(`http://localhost:3001${endpoint}`, {
        nombre,
        password
      });

      if (modo === 'login') {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('usuarioNombre', res.data.nombre);
        onLogin(res.data.nombre);
      } else {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        setModo('login');
      }
    } catch (err) {
      console.error('Error en autenticación:', err);
      alert('Error: ' + (err.response?.data?.error || 'Intenta de nuevo'));
    }
  };

  return (
    <div className="auth-container">
      <h2>{modo === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h2>
      <form onSubmit={handleSubmit}>
        <label>Nombre:</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <label>Contraseña:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">
          {modo === 'login' ? 'Entrar' : 'Registrar'}
        </button>
      </form>
      <p>
        {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
        <button onClick={() => setModo(modo === 'login' ? 'register' : 'login')}>
          {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
        </button>
      </p>
    </div>
  );
}

export default Auth;
