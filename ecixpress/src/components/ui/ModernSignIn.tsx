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
  const [mounted, setMounted] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  //  VALIDACIÓN INTELIGENTE EMAIL
  const validateEmail = (value: string) => {
    if (!value) return 'El correo es obligatorio';

    if (!value.includes('@')) {
      return 'Debe incluir "@"';
    }

    const parts = value.split('@');
    if (parts.length < 2 || !parts[1]) {
      return 'Falta el dominio (ej: gmail.com)';
    }

    const domain = parts[1];
    if (!domain.includes('.')) {
      return 'Dominio incompleto (ej: gmail.com)';
    }

    return '';
  };

  //  VALIDACIÓN PASSWORD
  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es obligatoria';

    if (value.length < 6) {
      return 'Mínimo 6 caracteres';
    }

    if (!/\d/.test(value)) {
      return 'Incluye al menos un número';
    }

    return '';
  };

  //  VALIDACIÓN EN TIEMPO REAL
  useEffect(() => {
    setErrors((prev) => ({
      ...prev,
      email: validateEmail(email),
    }));
  }, [email]);

  useEffect(() => {
    setErrors((prev) => ({
      ...prev,
      password: validatePassword(password),
    }));
  }, [password]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) return;

    setIsLoading(true);

    setTimeout(() => {
      console.log('Sign in:', { email, password });
      setIsLoading(false);
    }, 1500);
  };

  if (!mounted) return null;

  return (
      <div className="min-h-screen w-full bg-white flex flex-col md:flex-row">

        {/* Carrusel */}
        <div className="hidden md:flex md:w-7/12 items-center justify-center p-6">
          <div className="w-full h-[600px]">
            <FoodCarousel />
          </div>
        </div>

        {/* Form */}
        <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12 bg-white">
          <div className="w-full max-w-sm space-y-8">

            {/* Header */}
            <div className="text-center space-y-2">
              <img src="/logotipoEcixpress.svg" className="h-10 mx-auto" />
              <h1 className="text-3xl font-bold">Bienvenido</h1>
              <p className="text-sm text-gray-600">
                Inicia sesión en tu cuenta
              </p>
            </div>

            <form onSubmit={handleSignIn} noValidate className="space-y-5">

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">Correo Electrónico</label>

                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className={`w-full px-4 py-3 rounded-lg border bg-gray-50
                ${errors.email
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-yellow-400'}
                focus:outline-none focus:ring-2 transition-all`}
                />

                {errors.email && email.length > 0 && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                       {errors.email}
                    </p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">Contraseña</label>

                <div className="relative">
                  <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 rounded-lg border bg-gray-50
                  ${errors.password
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-yellow-400'}
                  focus:outline-none focus:ring-2 transition-all`}
                  />

                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {errors.password && password.length > 0 && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                       {errors.password}
                    </p>
                )}
              </div>

              {/* BUTTON */}
              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:scale-[1.02] transition"
              >
                {isLoading ? 'Conectando...' : 'Iniciar Sesión'}
              </button>

            </form>

            {/* Footer */}
            <p className="text-center text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <button onClick={onSignUpClick} className="text-yellow-600 font-semibold">
                Regístrate
              </button>
            </p>

          </div>
        </div>
      </div>
  );
};

export default ModernSignIn;