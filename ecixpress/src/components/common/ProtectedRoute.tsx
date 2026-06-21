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
        <div className="w-full max-w-3xl space-y-4 px-6 animate-pulse">
          <div className="h-6 w-48 rounded-full bg-white/80" />
          <div className="rounded-2xl bg-white/70 p-6 shadow-sm">
            <div className="mb-5 h-4 w-2/3 rounded-full bg-gray-100" />
            <div className="space-y-3">
              <div className="h-3 rounded-full bg-gray-100" />
              <div className="h-3 w-5/6 rounded-full bg-gray-100" />
              <div className="h-3 w-3/4 rounded-full bg-gray-100" />
            </div>
          </div>
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
