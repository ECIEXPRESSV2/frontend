import React, { useState, useEffect } from 'react';
import AuthLayout from './AuthLayout';
import FormInput from './FormInput';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword, validateName, validateConfirmPassword } from '../../lib/validation';

interface SignUpProps {
  onSignInClick?: () => void;
}

const SignUpForm: React.FC<SignUpProps> = ({ onSignInClick }) => {
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
      confirmPassword: validateConfirmPassword(confirmPassword, password),
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