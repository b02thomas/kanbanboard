
import React from 'react';
import { Link } from 'react-router-dom';
import SMBAILogo from './SMBAILogo';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const LogoHeader = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="app-header">
      <Link to="/" className='logo-container'>
        <SMBAILogo />
        <h1>Kanban Board</h1>
      </Link>
      <nav>
        {isAuthenticated ? (
          <>
            <Link to="/profile">{user.name}</Link>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <button onClick={logout} className='logout-button'>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
        <button onClick={toggleTheme} className="theme-toggle-button">
           {theme === 'light' ? '<' : ' '}
        </button>
      </nav>
    </header>
  );
};

export default LogoHeader;
