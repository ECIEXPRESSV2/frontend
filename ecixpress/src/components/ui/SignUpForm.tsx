import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AuthLayout from './AuthLayout';
import FormInput from './FormInput';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword, validateName, validateConfirmPassword } from '../../lib/validation';
import { useAuth } from '../../context/AuthContext';

interface SignUpProps {
  onSignInClick?: () => void;
  onSignUpSuccess?: () => void;
}

const SignUpForm: React.FC<SignUpProps> = ({ onSignInClick, onSignUpSuccess }) => {
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const validatePhone = (v: string) => {
    if (!v.trim()) return 'El celular es obligatorio';
    if (!/^\+?[\d\s\-()]{7,15}$/.test(v.trim())) return 'Número inválido';
    return '';
  };

  useEffect(() => {
    setErrors(prev => ({ ...prev, name: validateName(name) }));
  }, [name]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, phone: validatePhone(phone) }));
  }, [phone]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    }));
  }, [confirmPassword, password]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    const newErrors = {
      name: validateName(name),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(err => err)) return;

    setIsLoading(true);
    try {
      await signUp(email, password, name, phone.trim());
      onSignUpSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear cuenta';
      toast.error(msg.includes('email-already-in-use') ? 'Este correo ya está registrado' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onSignUpSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error con Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout carouselPosition="right" dense>
      {/* Header */}
      <div className="text-center space-y-1">
        <img src="/logotipoEcixpress.svg" className="h-8 mx-auto mb-2" alt="EciXpress" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-gray-500">Únete a la plataforma</p>
      </div>

      <form onSubmit={handleSignUp} noValidate className="space-y-2.5 [&_input]:py-2.5">
        <FormInput
          label="Nombre"
          type="text"
          value={name}
          onChange={setName}
          onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
          placeholder="Juan Pérez"
          error={errors.name}
          touched={touched.name}
        />

        <FormInput
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
          placeholder="ejemplo@empresa.com"
          error={errors.email}
          touched={touched.email}
        />

        <FormInput
          label="Celular"
          type="tel"
          value={phone}
          onChange={setPhone}
          onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
          placeholder="+57 300 123 4567"
          error={errors.phone}
          touched={touched.phone}
        />

        <PasswordInput
          label="Contraseña"
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
          error={errors.password}
          touched={touched.password}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />

        <PasswordInput
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        <button
          type="submit"
          disabled={isLoading}
          style={{ ['--glow-size' as string]: '220px' }}
          className="glass-spotlight w-full py-3 mt-1 rounded-xl font-semibold text-sm text-black
            bg-gradient-to-r from-yellow-400 to-yellow-500
            hover:from-yellow-500 hover:to-yellow-600 hover:-translate-y-0.5
            active:scale-[.98] transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
            shadow-lg shadow-yellow-200/60 hover:shadow-xl hover:shadow-yellow-300/60"
        >
          <span className="relative z-10">{isLoading ? 'Creando...' : 'Crear Cuenta'}</span>
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-2">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-400">o</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        style={{ ['--glow-size' as string]: '220px' }}
        className="glass-spotlight w-full py-3 rounded-xl font-semibold text-sm text-gray-700
          bg-white/60 backdrop-blur-md border border-white/60
          hover:bg-white/80 hover:border-white/80 hover:-translate-y-0.5
          active:scale-[.98] transition-all duration-200
          shadow-sm hover:shadow-md flex items-center justify-center gap-3
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg className="relative z-10 w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Registrarse con Google
      </button>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <button
          onClick={onSignInClick}
          className="text-yellow-600 font-semibold hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </AuthLayout>
  );
};

export default SignUpForm;