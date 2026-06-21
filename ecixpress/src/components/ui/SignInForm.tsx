import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AuthLayout from './AuthLayout';
import FormInput from './FormInput';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword } from '../../lib/validation';
import { useAuth } from '../../context/AuthContext';

interface SignInProps {
  onSignUpClick?: () => void;
  onLoginSuccess?: () => void;
}

const SignInForm: React.FC<SignInProps> = ({ onSignUpClick, onLoginSuccess }) => {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [errors, setErrors] = useState({ email: '', password: '' });

  useEffect(() => {
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  }, [email]);

  useEffect(() => {
    setErrors(prev => ({ ...prev, password: validatePassword(password) }));
  }, [password]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;
    setIsLoading(true);
    try {
      await signIn(email, password);
      onLoginSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      toast.error(msg.includes('invalid-credential') ? 'Correo o contraseña incorrectos' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      // Mostrar mensaje genérico para no revelar si el email existe
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onLoginSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error con Google';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (showReset) {
    return (
      <AuthLayout carouselPosition="left">
        <div className="text-center space-y-1">
          <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500">Te enviaremos un enlace a tu correo</p>
        </div>

        {resetSent ? (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center space-y-3">
            <p className="text-sm text-green-700 font-medium">
              Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.
            </p>
            <button
              type="button"
              onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
              className="text-sm text-yellow-600 font-semibold hover:underline"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} noValidate className="space-y-4">
            <FormInput
              label="Correo electrónico"
              type="email"
              value={resetEmail}
              onChange={setResetEmail}
              onBlur={() => {}}
              placeholder="ejemplo@empresa.com"
              error=""
              touched={false}
            />
            <button
              type="submit"
              disabled={resetLoading || !resetEmail}
              className="w-full py-3 mt-1 rounded-xl font-semibold text-sm text-black
                bg-gradient-to-r from-yellow-400 to-yellow-500
                hover:from-yellow-500 hover:to-yellow-600
                active:scale-[.98] transition-all duration-150
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-lg shadow-yellow-200/60"
            >
              {resetLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <p className="text-center text-sm text-gray-500">
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-yellow-600 font-semibold hover:underline"
              >
                ← Volver al inicio de sesión
              </button>
            </p>
          </form>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout carouselPosition="left">
      {/* Header */}
      <div className="text-center space-y-1">
        <img src="/logotipoEcixpress.svg" className="h-9 mx-auto mb-2" alt="EciXpress" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bienvenido</h1>
        <p className="text-sm text-gray-500">Inicia sesión en tu cuenta</p>
      </div>

      <form onSubmit={handleSignIn} noValidate className="space-y-4">
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

        <div className="space-y-1">
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
          <div className="text-right">
            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); }}
              className="text-xs text-yellow-600 hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

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

      {/* Divider */}
      <div className="flex items-center gap-4 my-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-400">o</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
        Continuar con Google
      </button>

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
    </AuthLayout>
  );
};

export default SignInForm;