import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import FoodCarousel from './FoodCarousel';

interface SignUpProps {
  onSignInClick?: () => void;
}

const ModernSignUp: React.FC<SignUpProps> = ({ onSignInClick }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      console.log('Sign up:', { name, email, password });
      setIsLoading(false);
    }, 1500);
  };

  if (!mounted) return null;

  return (
      <div className="min-h-screen w-full bg-white flex flex-col md:flex-row">

        {/* Left side - Form */}
        <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12 bg-white">
          <div className="w-full max-w-sm space-y-8">

            {/* Logo */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-center gap-1">
                <img
                    src="/logotipoEcixpress.svg"
                    alt="Ecixpress"
                    className="h-10 w-auto"
                />
              </div>
              <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Tu plataforma de pedidos
              </p>
            </div>

            {/* Header */}
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Crear Cuenta
              </h1>
              <p className="text-sm text-gray-600">
                Únete a nuestra comunidad hoy
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignUp} className="space-y-4">

              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Nombre Completo
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Correo Electrónico
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                    required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                      required
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                      required
                  />
                  <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creando cuenta...
                    </>
                ) : (
                    'Crear Cuenta'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-white text-xs text-gray-500">o</span>
              </div>
            </div>

            {/* Sign in link */}
            <p className="text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <button
                  type="button"
                  onClick={onSignInClick}
                  className="font-semibold text-yellow-600 hover:text-yellow-700"
              >
                Inicia sesión
              </button>
            </p>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>Aceptas nuestros términos de servicio al continuar</p>
              <p className="text-gray-400">Protegido con encriptación TLS</p>
            </div>
          </div>
        </div>

        {/* Right side - Carousel */}
        <div className="hidden md:flex md:w-7/12 items-center justify-center p-6">
          <div className="w-full h-[600px]">
            <FoodCarousel />
          </div>
        </div>

      </div>
  );
};

export default ModernSignUp;

