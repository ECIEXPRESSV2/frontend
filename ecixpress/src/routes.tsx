import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import SignInForm from './components/ui/SignInForm';
import SignUpForm from './components/ui/SignUpForm';
import Home from './pages/home/Home';
import StoreDetail from './pages/store/StoreDetail';
import CartPage from './pages/cart/CartPage';
import AccountLayout from './pages/user/account/AccountLayout';
import ResumenSection from './pages/user/account/sections/ResumenSection';
import InformacionSection from './pages/user/account/sections/InformacionSection';
import BilleteraSection from './pages/user/account/sections/BilleteraSection';
import SeguridadSection from './pages/user/account/sections/SeguridadSection';
import PlaceholderSection from './pages/user/account/sections/PlaceholderSection';
import ProtectedRoute from './components/common/ProtectedRoute';
import UsersPage from './pages/admin/UsersPage';
import RolesPage from './pages/admin/RolesPage';
import StoresPage from './pages/admin/StoresPage';
import AuditPage from './pages/admin/AuditPage';
import VendorStoresPage from './pages/vendor/VendorStoresPage';
import ProductsManagementPage from './pages/vendor/ProductsManagementPage';
import PromotionsPage from './pages/vendor/PromotionsPage';
import OrdersPage from './pages/orders/OrdersPage';
import MessagesPage from './pages/messages/MessagesPage';
import PickupCodePage from './pages/fulfillment/PickupCodePage';
import DeliveriesPage from './pages/fulfillment/DeliveriesPage';

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const openOrdersDemo = () => navigate('/orders');
  const openMessagesDemo = () => navigate('/messages');
  const goHome = () => navigate('/home');

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Main App */}
      <Route path="/home" element={<ProtectedRoute><Home onUserClick={() => navigate('/profile')} onCartClick={() => navigate('/cart')} onOrdersClick={openOrdersDemo} onMessagesClick={openMessagesDemo} /></ProtectedRoute>} />
      <Route path="/store/:storeId" element={<ProtectedRoute><StoreDetail onBack={goHome} onOrdersClick={openOrdersDemo} onMessagesClick={openMessagesDemo} /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/profile/resumen" replace />} />
        <Route path="resumen" element={<ResumenSection />} />
        <Route path="informacion" element={<InformacionSection />} />
        <Route path="billetera" element={<BilleteraSection />} />
        <Route path="pagos" element={<Navigate to="/profile/billetera" replace />} />
        <Route path="pedidos" element={<Navigate to="/orders" replace />} />
        <Route path="notificaciones" element={<Navigate to="/profile/resumen" replace />} />
        <Route path="seguridad" element={<SeguridadSection />} />
        <Route path="ayuda" element={<PlaceholderSection titulo="Ayuda" />} />
      </Route>
      <Route path="/cart" element={<ProtectedRoute><CartPage onBack={goHome} onOrdersClick={openOrdersDemo} onMessagesClick={openMessagesDemo} /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrdersPage onBack={goHome} /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage onBack={goHome} /></ProtectedRoute>} />

      {/* Fulfillment */}
      <Route path="/fulfillment/code/:orderId" element={<ProtectedRoute><PickupCodePage onBack={openOrdersDemo} /></ProtectedRoute>} />
      <Route path="/fulfillment/deliveries" element={<ProtectedRoute requireVendor><DeliveriesPage onBack={goHome} /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UsersPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><RolesPage /></ProtectedRoute>} />
      <Route path="/admin/stores" element={<ProtectedRoute requireAdmin><StoresPage /></ProtectedRoute>} />
      <Route path="/admin/stores/:storeId" element={<ProtectedRoute requireAdmin><StoresPage /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute requireAdmin><AuditPage /></ProtectedRoute>} />

      {/* Vendor */}
      <Route path="/vendor/stores" element={<ProtectedRoute requireVendor><VendorStoresPage /></ProtectedRoute>} />
      <Route path="/vendor/stores/:storeId/products" element={<ProtectedRoute requireVendor><ProductsManagementPage /></ProtectedRoute>} />
      <Route path="/vendor/stores/:storeId/promotions" element={<ProtectedRoute requireVendor><PromotionsPage /></ProtectedRoute>} />

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
        onClick={() => navigate('/')}
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
        onClick={() => navigate('/')}
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
