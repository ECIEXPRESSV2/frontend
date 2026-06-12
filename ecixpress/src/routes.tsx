import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './pages/landing/LandingPage';
import SignInForm from './components/ui/SignInForm';
import SignUpForm from './components/ui/SignUpForm';
import Home from './pages/home/Home';
import StoreDetail from './pages/store/StoreDetail';
import UserProfile from './pages/user/UserProfile';
import CartPage from './pages/cart/CartPage';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Authentication */}
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      
      {/* Main App */}
      <Route path="/home" element={<Home />} />
      
      {/* Store Detail */}
      <Route path="/store/:storeId" element={<StoreDetail />} />
      
      {/* User Profile */}
      <Route path="/profile" element={<UserProfile />} />
      
      {/* Cart */}
      <Route path="/cart" element={<CartPage />} />
      
      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Wrapper components for auth pages with back button
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
