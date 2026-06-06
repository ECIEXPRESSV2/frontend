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
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // VALIDACIONES
  const validateName = (value: string) => {
    if (!value) return 'El nombre es obligatorio';
    if (value.length < 3) return 'El nombre es demasiado corto';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'El correo es obligatorio';
    if (!value.includes('@')) return 'Debe incluir "@"';
    const [, domain] = value.split('@');
    if (!domain) return 'Falta el dominio';
    if (!domain.includes('.')) return 'Dominio incompleto';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es obligatoria';
    if (value.length < 6) return 'Mínimo 6 caracteres';
    if (!/\d/.test(value)) return 'Incluye un número';
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return 'Confirma tu contraseña';
    if (value !== password) return 'No coinciden';
    return '';
  };

  // VALIDACIONES EN VIVO
  useEffect(() => {
    setErrors(prev => ({ ...prev, name: validateName(name) }));
  }, [name]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      confirmPassword: validateConfirmPassword(confirmPassword),
    }));
  }, [confirmPassword, password]);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const newErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(err => err)) return;

    setIsLoading(true);

    setTimeout(() => {
      console.log('Sign up:', { name, email, password });
      setIsLoading(false);
    }, 1500);
  };

  return (
      <div className="min-h-screen w-full flex flex-col md:flex-row-reverse bg-gradient-to-br from-yellow-50 via-white to-yellow-100">

        {/* CARRUSEL  */}
        <div className="relative hidden md:flex md:w-7/12 h-screen overflow-hidden bg-gradient-to-br from-white via-yellow-50">
          <div className="absolute inset-0 backdrop-blur-xl bg-white/10"></div>

          <div className="relative w-full h-full">
            <FoodCarousel className="w-full h-full" />
          </div>
        </div>

        {/* PANEL DERECHO — IGUAL */}
        <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12
                    bg-white/40 backdrop-blur-2xl border-r border-red-500 border-white/30">

          <div className="w-full max-w-sm space-y-6
                      bg-white/50 backdrop-blur-xl
                      border border-white/40
                      shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                      rounded-2xl p-8">

            {/* HEADER */}
            <div className="text-center space-y-1">
              <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crear cuenta</h1>
              <p className="text-sm text-gray-500">Únete a la plataforma</p>
            </div>

            <form onSubmit={handleSignUp} noValidate className="space-y-4">

              {/* NAME */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Nombre
                </label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                    placeholder="Juan Pérez"
                    className={`w-full px-4 py-3 rounded-xl border text-sm
                bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
                ${
                        touched.name && errors.name
                            ? 'border-red-400 ring-2 ring-red-100'
                            : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                    }`}
                />
                {touched.name && errors.name && (
                    <p className="text-red-500 text-xs">{errors.name}</p>
                )}
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Correo electrónico
                </label>
                <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                    placeholder="ejemplo@empresa.com"
                    className={`w-full px-4 py-3 rounded-xl border text-sm
                bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
                ${
                        touched.email && errors.email
                            ? 'border-red-400 ring-2 ring-red-100'
                            : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                    }`}
                />
                {touched.email && errors.email && (
                    <p className="text-red-500 text-xs">{errors.email}</p>
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
                  ${
                          touched.password && errors.password
                              ? 'border-red-400 ring-2 ring-red-100'
                              : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                      }`}
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {touched.password && errors.password && (
                    <p className="text-red-500 text-xs">{errors.password}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onBlur={() =>
                          setTouched(prev => ({ ...prev, confirmPassword: true }))
                      }
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm
                  bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
                  ${
                          touched.confirmPassword && errors.confirmPassword
                              ? 'border-red-400 ring-2 ring-red-100'
                              : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                      }`}
                  />
                  <button
                      type="button"
                      onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                        <EyeOff size={17} />
                    ) : (
                        <Eye size={17} />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                    <p className="text-red-500 text-xs">
                      {errors.confirmPassword}
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
                {isLoading ? 'Creando...' : 'Crear Cuenta'}
              </button>

            </form>

            {/* FOOTER */}
            <p className="text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <button
                  onClick={onSignInClick}
                  className="text-yellow-600 font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </p>

          </div>
        </div>
      </div>
  );
};

export default ModernSignUp;