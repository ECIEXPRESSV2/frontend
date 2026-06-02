import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";

interface LoginFormErrors {
  email?: string;
  password?: string;
}

export const useLogin = () => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.password.trim()) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validación en tiempo real si el campo fue tocado
    if (touched[name as keyof typeof touched]) {
      validateField(name, value);
    }
  };

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    if (name === "email") {
      if (!value.trim()) {
        newErrors.email = "El email es requerido";
      } else if (!validateEmail(value)) {
        newErrors.email = "Email inválido";
      } else {
        delete newErrors.email;
      }
    }

    if (name === "password") {
      if (!value.trim()) {
        newErrors.password = "La contraseña es requerida";
      } else if (value.length < 6) {
        newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      } else {
        delete newErrors.password;
      }
    }

    setErrors(newErrors);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, completa correctamente el formulario");
      return;
    }

    const success = await login(formData.email, formData.password);

    if (success) {
      toast.success("¡Inicio de sesión exitoso!");
      setFormData({ email: "", password: "" });
      setTouched({ email: false, password: false });
      setErrors({});
      // Aquí se redirige al dashboard
    } else {
      toast.error("Email o contraseña incorrectos");
    }
  };

  return {
    formData,
    errors,
    touched,
    loading,
    handleChange,
    handleBlur,
    handleSubmit,
  };
};

