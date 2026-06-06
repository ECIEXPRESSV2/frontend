import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import FoodCarousel from './FoodCarousel';

interface SignInProps {
  onSignUpClick?: () => void;
}

const ModernSignIn: React.FC<SignInProps> = ({ onSignUpClick }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateEmail = (value: string) => {
    if (!value) return 'El correo es obligatorio';
    if (!value.includes('@')) return 'Debe incluir "@"';
    const [, domain] = value.split('@');
    if (!domain) return 'Falta el dominio (ej: gmail.com)';
    if (!domain.includes('.')) return 'Dominio incompleto (ej: gmail.com)';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es obligatoria';
    if (value.length < 6) return 'Mínimo 6 caracteres';
    if (!/\d/.test(value)) return 'Incluye al menos un número';
    return '';
  };

  useEffect(() => {
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;
    setIsLoading(true);
    setTimeout(() => {
      console.log('Sign in:', { email, password });
      setIsLoading(false);
    }, 1500);
  };

  return (
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-yellow-50 via-white to-yellow-100">


        {/* Carrusel — izquierda */}
        <div className="relative hidden md:flex md:w-7/12 h-screen overflow-hidden bg-gradient-to-br from-white via-yellow-50 ">

          {/* Fondo glass */}
          <div className="absolute inset-0 backdrop-blur-xl bg-white/10"></div>

          {/* Carrusel*/}
          <div className="relative w-full h-full">
            <FoodCarousel className="w-full h-full" />
          </div>
        </div>


        {/* Panel derecho — liquid glass */}
        <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12
                      bg-white/40 backdrop-blur-2xl border-l border-white/30">
          <div className="w-full max-w-sm space-y-6
                        bg-white/50 backdrop-blur-xl
                        border border-white/40
                        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                        rounded-2xl p-8">

            {/* Header */}
            <div className="text-center space-y-1">
              <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bienvenido</h1>
              <p className="text-sm text-gray-500">Inicia sesión en tu cuenta</p>
            </div>

            <form onSubmit={handleSignIn} noValidate className="space-y-4">

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Correo electrónico
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    placeholder="ejemplo@empresa.com"
                    className={`w-full px-4 py-3 rounded-xl border text-sm
                  bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
                  ${touched.email && errors.email
                        ? 'border-red-400 ring-2 ring-red-100'
                        : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                    }`}
                />
                {touched.email && errors.email && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <span></span> {errors.email}
                    </p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm
                    bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
                    ${touched.password && errors.password
                          ? 'border-red-400 ring-2 ring-red-100'
                          : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                      }`}
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {touched.password && errors.password && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <span></span> {errors.password}
                    </p>
                )}
              </div>

              {/* BUTTON */}
              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 mt-1 rounded-xl font-semibold text-sm text-black
                bg-gradient-to-r from-yellow-400 to-yellow-500
                hover:from-yellow-500 hover:to-yellow-600
                active:scale-[.98] transition-all duration-150
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-lg shadow-yellow-200/60"
              >
                {isLoading ? 'Conectando...' : 'Iniciar Sesión'}
              </button>

            </form>

            {/* Footer */}
            <p className="text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <button
                  onClick={onSignUpClick}
                  className="text-yellow-600 font-semibold hover:underline"
              >
                Regístrate
              </button>
            </p>

          </div>
        </div>
      </div>
  );
};

export default ModernSignIn;