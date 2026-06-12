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
  const { signUp, signInWithGoogle, resendVerificationEmail } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

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
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    }));
  }, [confirmPassword, password]);

  const handleSignUp = async (e: React.FormEvent) => {
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
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    };

    setErrors(newErrors);
    if (Object.values(newErrors).some(err => err)) return;

    setIsLoading(true);
    try {
      await signUp(email, password, name);
      setRegisteredEmail(email);
      setVerificationSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear cuenta';
      toast.error(msg.includes('email-already-in-use') ? 'Este correo ya está registrado' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendVerificationEmail();
      toast.success('Enlace de verificación reenviado');
    } catch {
      toast.error('No se pudo reenviar el enlace');
    } finally {
      setResendLoading(false);
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

  if (verificationSent) {
    return (
      <AuthLayout carouselPosition="right">
        <div className="text-center space-y-1">
          <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Verifica tu correo</h1>
          <p className="text-sm text-gray-500">Un paso más antes de continuar</p>
        </div>

        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 space-y-3 text-center">
          <div className="text-4xl">📧</div>
          <p className="text-sm text-gray-700">
            Enviamos un enlace de verificación a{' '}
            <span className="font-semibold text-gray-900">{registeredEmail}</span>.
          </p>
          <p className="text-xs text-gray-500">
            Abre el correo y haz clic en el enlace para activar tu cuenta.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSignUpSuccess?.()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-black
              bg-gradient-to-r from-yellow-400 to-yellow-500
              hover:from-yellow-500 hover:to-yellow-600
              active:scale-[.98] transition-all duration-150
              shadow-lg shadow-yellow-200/60"
          >
            Ir a la aplicación
          </button>
          <p className="text-center text-xs text-gray-500">
            ¿No recibiste el correo?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-yellow-600 font-semibold hover:underline disabled:opacity-50"
            >
              {resendLoading ? 'Enviando...' : 'Reenviar enlace'}
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout carouselPosition="right">
      {/* Header */}
      <div className="text-center space-y-1">
        <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-gray-500">Únete a la plataforma</p>
      </div>

      <form onSubmit={handleSignUp} noValidate className="space-y-4">
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

      {/* Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-400">o</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isLoading}
        className="w-full py-3 rounded-xl font-semibold text-sm text-gray-700
          bg-white/80 backdrop-blur-sm border border-gray-200
          hover:bg-white hover:border-gray-300
          active:scale-[.98] transition-all duration-150
          shadow-sm flex items-center justify-center gap-3
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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