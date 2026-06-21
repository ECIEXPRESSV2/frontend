export const validateEmail = (value: string): string => {
  if (!value) return 'El correo es obligatorio';
  if (!value.includes('@')) return 'Debe incluir "@"';
  const [, domain] = value.split('@');
  if (!domain) return 'Falta el dominio (ej: gmail.com)';
  if (!domain.includes('.')) return 'Dominio incompleto (ej: gmail.com)';
  return '';
};

export const validatePassword = (value: string): string => {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 6) return 'Mínimo 6 caracteres';
  if (!/\d/.test(value)) return 'Incluye al menos un número';
  return '';
};

export const validateName = (value: string): string => {
  if (!value) return 'El nombre es obligatorio';
  if (value.length < 3) return 'El nombre es demasiado corto';
  return '';
};

export const validateConfirmPassword = (value: string, password: string): string => {
  if (!value) return 'Confirma tu contraseña';
  if (value !== password) return 'No coinciden';
  return '';
};
