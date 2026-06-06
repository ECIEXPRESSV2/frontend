import React, { useState, useEffect } from 'react';
import AuthLayout from './AuthLayout';
import FormInput from './FormInput';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword } from '../../lib/validation';

interface SignInProps {
  onSignUpClick?: () => void;
}

const SignInForm: React.FC<SignInProps> = ({ onSignUpClick }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const [errors, setErrors] = useState({ email: '', password: '' });

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
    </AuthLayout>
  );
};

export default SignInForm;