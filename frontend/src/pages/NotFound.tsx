import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const NotFound: React.FC = () => {
  const { role } = useAuth();
  return (
    <div className="not-found">
      <div className="stack-sm" style={{ alignItems: 'center' }}>
        <h1>404</h1>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Page not found</h2>
        <p className="muted">The page you're looking for doesn't exist or was moved.</p>
        <Link to={role === 'BUSINESS' ? '/admin' : role ? '/' : '/login'} className="btn btn-primary" style={{ marginTop: 16 }}>
          Go home
        </Link>
      </div>
    </div>
  );
};
