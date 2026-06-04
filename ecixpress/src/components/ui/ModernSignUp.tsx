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

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);


  const validateName = (value: string) => {
    if (!value) return 'El nombre es obligatorio';
    if (value.length < 3) return 'El nombre es demasiado corto';
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value) return 'El correo es obligatorio';

    if (!value.includes('@')) return 'Debe incluir "@"';

    const parts = value.split('@');
    if (!parts[1]) return 'Falta el dominio';

    if (!parts[1].includes('.')) return 'Dominio incompleto (ej: gmail.com)';

    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'La contraseña es obligatoria';

    if (value.length < 6) return 'Mínimo 6 caracteres';

    if (!/\d/.test(value)) return 'Incluye al menos un número';

    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return 'Confirma tu contraseña';

    if (value !== password) return 'Las contraseñas no coinciden';

    return '';
  };


  useEffect(() => {
    setErrors((prev) => ({ ...prev, name: validateName(name) }));
  }, [name]);

  useEffect(() => {
    setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  useEffect(() => {
    setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  useEffect(() => {
    setErrors((prev) => ({
      ...prev,
      confirmPassword: validateConfirmPassword(confirmPassword),
    }));
  }, [confirmPassword, password]);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };

    setErrors(newErrors);

    if (
        newErrors.name ||
        newErrors.email ||
        newErrors.password ||
        newErrors.confirmPassword
    )
      return;

    setIsLoading(true);

    setTimeout(() => {
      console.log('Sign up:', { name, email, password });
      setIsLoading(false);
    }, 1500);
  };

  if (!mounted) return null;

  return (
      <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">

        {/* FORM */}
        <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm space-y-8">

            {/* HEADER */}
            <div className="text-center space-y-2">
              <img src="/logotipoEcixpress.svg" className="h-10 mx-auto" />
              <h1 className="text-3xl font-bold">Crear Cuenta</h1>
              <p className="text-sm text-gray-600">
                Únete a nuestra comunidad
              </p>
            </div>

            <form onSubmit={handleSignUp} noValidate className="space-y-4">

              {/* NAME */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">Nombre Completo</label>

                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Pérez"
                    className={`w-full px-4 py-3 rounded-lg border bg-gray-50
                ${errors.name
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-yellow-400'}
                focus:outline-none focus:ring-2 transition`}
                />

                {errors.name && name.length > 0 && (
                    <p className="text-red-500 text-xs"> {errors.name}</p>
                )}
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">Correo</label>

                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    className={`w-full px-4 py-3 rounded-lg border bg-gray-50
                ${errors.email
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-200 focus:ring-yellow-400'}
                focus:outline-none focus:ring-2 transition`}
                />

                {errors.email && email.length > 0 && (
                    <p className="text-red-500 text-xs"> {errors.email}</p>
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
                  focus:outline-none focus:ring-2 transition`}
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
                    <p className="text-red-500 text-xs"> {errors.password}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-1">
                <label className="text-sm font-semibold">Confirmar Contraseña</label>

                <div className="relative">
                  <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 rounded-lg border bg-gray-50
                  ${errors.confirmPassword
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-yellow-400'}
                  focus:outline-none focus:ring-2 transition`}
                  />

                  <button
                      type="button"
                      onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showConfirmPassword ? (
                        <EyeOff size={18} />
                    ) : (
                        <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.confirmPassword && confirmPassword.length > 0 && (
                    <p className="text-red-500 text-xs">
                      {errors.confirmPassword}
                    </p>
                )}
              </div>

              {/* BUTTON */}
              <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:scale-[1.02] transition"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>

            </form>

            {/* LINK */}
            <p className="text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <button
                  onClick={onSignInClick}
                  className="text-yellow-600 font-semibold"
              >
                Inicia sesión
              </button>
            </p>

          </div>
        </div>

        {/* CAROUSEL */}
        <div className="hidden md:flex md:w-7/12 items-center justify-center p-6">
          <div className="w-full h-[600px]">
            <FoodCarousel />
          </div>
        </div>

      </div>
  );
};

export default ModernSignUp;