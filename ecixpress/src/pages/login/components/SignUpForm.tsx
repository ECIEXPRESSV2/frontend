import { motion } from "framer-motion";
import StandardInput from "../../../lib/input/StandardInput";
import Button from "../../../components/ui/Button";
import Logo from "../../../components/common/Logo";

interface SignUpFormProps {
  formData: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  touched: {
    name: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
  };
  loading: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onSwitchToLogin: () => void;
}

const SignUpForm = ({
  formData,
  errors,
  touched,
  loading,
  handleChange,
  handleBlur,
  handleSubmit,
  onSwitchToLogin,
}: SignUpFormProps) => {
  return (
    <motion.div
      key="signup-form"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="w-full max-w-md flex flex-col items-center justify-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mb-6"
      >
        <Logo size={120} />
      </motion.div>

      {/* Card Container */}
      <motion.div
        className="w-full bg-white rounded-2xl shadow-lg p-7"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Crear Cuenta
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Únete a nuestra comunidad hoy
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <StandardInput
            label="Nombre Completo"
            type="text"
            placeholder="Juan Pérez"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            touched={touched.name}
            disabled={loading}
          />

          {/* Email Input */}
          <StandardInput
            label="Correo Electrónico"
            type="email"
            placeholder="tu@email.com"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            touched={touched.email}
            disabled={loading}
          />

          {/* Password Input */}
          <StandardInput
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            touched={touched.password}
            disabled={loading}
          />

          {/* Confirm Password Input */}
          <StandardInput
            label="Confirmar Contraseña"
            type="password"
            placeholder="••••••••"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.confirmPassword}
            touched={touched.confirmPassword}
            disabled={loading}
          />

          {/* Terms Agreement */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-start gap-2"
          >
            <input
              type="checkbox"
              id="terms"
              className="mt-1 w-3 h-3 accent-secondary rounded focus:ring-2 focus:ring-secondary/20 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-600 font-medium">
              Acepto los{" "}
              <a href="#" className="text-secondary hover:underline">
                términos de servicio
              </a>{" "}
              y la{" "}
              <a href="#" className="text-secondary hover:underline">
                política de privacidad
              </a>
            </label>
          </motion.div>

          {/* Sign Up Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <Button
              type="submit"
              text={loading ? "Registrando..." : "Crear Cuenta"}
              variant="secondary"
              size="md"
              loading={loading}
              disabled={loading}
            />
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center gap-3 my-5"
        >
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 font-medium">o</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </motion.div>

        {/* Social Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <button
            type="button"
            className="w-full py-2 px-4 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 transition font-semibold text-sm text-gray-700 flex items-center justify-center gap-2"
          >
            <img src="/icons.svg" alt="Google" className="w-4 h-4" />
            Continuar con Google
          </button>
        </motion.div>

        {/* Switch to Login */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600 font-medium">
            ¿Ya tienes cuenta?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-secondary hover:text-cyan-600 font-bold transition"
            >
              Inicia sesión
            </button>
          </p>
        </motion.div>
      </motion.div>

      {/* Geometric Decorations */}
      <motion.div
        className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-20 right-0 w-20 h-20 bg-secondary/5 rounded-full blur-3xl"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </motion.div>
  );
};

export default SignUpForm;

