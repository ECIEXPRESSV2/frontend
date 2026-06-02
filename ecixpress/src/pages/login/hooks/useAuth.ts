import { useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, _password: string) => {
    setLoading(true);
    setError(null);
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Aquí iría la lógica real de autenticación
      setUser({
        id: "1",
        email,
        name: email.split("@")[0],
      });
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    _password: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Aquí iría la lógica real de registro
      setUser({
        id: "1",
        email,
        name,
      });
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
  };

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
  };
};

