import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireVendor?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireVendor = false,
}) => {
  const { firebaseUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/signin" replace />;

  if (userProfile?.status === 'INACTIVE' || userProfile?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
        <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cuenta suspendida</h2>
          <p className="text-gray-500 text-sm">Contacta al administrador para recuperar el acceso.</p>
        </div>
      </div>
    );
  }

  const roles = userProfile?.roles ?? [];

  if (requireAdmin && !roles.includes('ADMIN')) {
    return <Navigate to="/home" replace />;
  }

  if (requireVendor && !roles.includes('VENDOR') && !roles.includes('ADMIN')) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
