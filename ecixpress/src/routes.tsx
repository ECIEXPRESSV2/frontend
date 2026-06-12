import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import SignInForm from './components/ui/SignInForm';
import SignUpForm from './components/ui/SignUpForm';
import Home from './pages/home/Home';
import StoreDetail from './pages/store/StoreDetail';
import UserProfile from './pages/user/UserProfile';
import CartPage from './pages/cart/CartPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import StoresPage from './pages/admin/StoresPage';
import AuditPage from './pages/admin/AuditPage';
import VendorStoresPage from './pages/vendor/VendorStoresPage';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Main App */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/store/:storeId" element={<ProtectedRoute><StoreDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><RolesPage /></ProtectedRoute>} />
      <Route path="/admin/stores" element={<ProtectedRoute requireAdmin><StoresPage /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><AuditPage /></ProtectedRoute>} />

      {/* Vendor */}
      <Route path="/vendor/stores" element={<ProtectedRoute requireVendor><VendorStoresPage /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-50 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
      >
        ← Volver
      </button>
      <SignInForm
        onSignUpClick={() => navigate('/signup')}
        onLoginSuccess={() => navigate('/home')}
      />
    </div>
  );
};

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-50 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
      >
        ← Volver
      </button>
      <SignUpForm
        onSignInClick={() => navigate('/signin')}
        onSignUpSuccess={() => navigate('/home')}
      />
    </div>
  );
};

export default AppRoutes;
