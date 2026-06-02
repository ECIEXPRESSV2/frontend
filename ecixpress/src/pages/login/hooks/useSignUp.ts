import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./useAuth";

interface SignUpFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const useSignUp = () => {
  const { signup, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<SignUpFormErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: SignUpFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    } else if (formData.name.length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    }

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

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
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

    if (touched[name as keyof typeof touched]) {
      validateField(name, value);
    }
  };

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    if (name === "name") {
      if (!value.trim()) {
        newErrors.name = "El nombre es requerido";
      } else if (value.length < 2) {
        newErrors.name = "El nombre debe tener al menos 2 caracteres";
      } else {
        delete newErrors.name;
      }
    }

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

      // Validar confirmPassword si ya tiene valor
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      } else if (formData.confirmPassword && value === formData.confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (name === "confirmPassword") {
      if (!value.trim()) {
        newErrors.confirmPassword = "Confirma tu contraseña";
      } else if (value !== formData.password) {
        newErrors.confirmPassword = "Las contraseñas no coinciden";
      } else {
        delete newErrors.confirmPassword;
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

    const success = await signup(
      formData.name,
      formData.email,
      formData.password
    );

    if (success) {
      toast.success("¡Registro exitoso! Bienvenido");
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setTouched({ name: false, email: false, password: false, confirmPassword: false });
      setErrors({});
      // Aquí se redirige al dashboard
    } else {
      toast.error("Error en el registro. Intenta de nuevo");
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

