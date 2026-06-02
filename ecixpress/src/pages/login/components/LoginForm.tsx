import { motion } from "framer-motion";
import StandardInput from "../../../lib/input/StandardInput";
import Button from "../../../components/ui/Button";
import Logo from "../../../components/common/Logo";

interface LoginFormProps {
  formData: {
    email: string;
    password: string;
  };
  errors: {
    email?: string;
    password?: string;
  };
  touched: {
    email: boolean;
    password: boolean;
  };
  loading: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  onSwitchToSignup: () => void;
}

const LoginForm = ({
  formData,
  errors,
  touched,
  loading,
  handleChange,
  handleBlur,
  handleSubmit,
  onSwitchToSignup,
}: LoginFormProps) => {
  return (
    <motion.div
      key="login-form"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
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
            Bienvenido
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Inicia sesión en tu cuenta
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Forgot Password Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex justify-end"
          >
            <a
              href="#"
              className="text-xs text-secondary hover:text-cyan-600 font-semibold transition"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </motion.div>

          {/* Login Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <Button
              type="submit"
              text={loading ? "Iniciando sesión..." : "Iniciar Sesión"}
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

        {/* Switch to SignUp */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600 font-medium">
            ¿No tienes cuenta?{" "}
            <button
              onClick={onSwitchToSignup}
              className="text-secondary hover:text-cyan-600 font-bold transition"
            >
              Regístrate aquí
            </button>
          </p>
        </motion.div>
      </motion.div>

      {/* Geometric Decorations */}
      <motion.div
        className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-20 left-0 w-20 h-20 bg-secondary/5 rounded-full blur-3xl"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </motion.div>
  );
};

export default LoginForm;

