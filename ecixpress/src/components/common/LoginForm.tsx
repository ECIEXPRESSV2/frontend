import { useState, type FormEvent } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";

interface LoginFormProps {
    onSubmit?: (email: string, password: string) => Promise<void>;
    onForgotPassword?: () => void;
    onSignUp?: () => void;
}

interface FormErrors {
    email?: string;
    password?: string;
}

interface PasswordRequirements {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
}

interface RequirementItemProps {
    text: string;
    met: boolean;
}

const RequirementItem = ({ text, met }: RequirementItemProps) => {
    return (
        <li className="flex items-center gap-2 text-xs font-body">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                met ? "bg-green-500 text-white" : "bg-gray-300 text-gray-500"
            }`}>
                {met ? "✓" : "✗"}
            </span>
            <span className={met ? "text-green-700" : "text-gray-500"}>
                {text}
            </span>
        </li>
    );
};

const LoginForm = ({ onSubmit, onForgotPassword, onSignUp }: LoginFormProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validación de email más robusta
        if (!email.trim()) {
            newErrors.email = "El correo es requerido";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            newErrors.email = "Ingresa un correo válido (ejemplo@dominio.com)";
        }

        // Validación de contraseña con requisitos de seguridad
        if (!password.trim()) {
            newErrors.password = "La contraseña es requerida";
        } else if (password.length < 8) {
            newErrors.password = "La contraseña debe tener al menos 8 caracteres";
        } else if (!/[A-Z]/.test(password)) {
            newErrors.password = "La contraseña debe tener al menos una mayúscula";
        } else if (!/[a-z]/.test(password)) {
            newErrors.password = "La contraseña debe tener al menos una minúscula";
        } else if (!/[0-9]/.test(password)) {
            newErrors.password = "La contraseña debe tener al menos un número";
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            newErrors.password = "La contraseña debe tener al menos un carácter especial";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getPasswordRequirements = (): PasswordRequirements => {
        return {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Heurística de Nielsen: Prevención de errores
        if (!validateForm()) return;

        try {
            setLoading(true);
            // Heurística de Nielsen: Visibilidad del estado del sistema
            if (onSubmit) {
                await onSubmit(email, password);
            }
        } catch (error) {
            // Heurística de Nielsen: Ayuda a reconocer, diagnosticar y recuperarse de errores
            console.error("Error al iniciar sesión:", error);
            setErrors({
                email: "Error al iniciar sesión. Intenta nuevamente.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        setShowPasswordRequirements(e.target.value.length > 0);
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Campos */}
            <div className="flex flex-col gap-4">
                <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={handleEmailChange}
                    error={errors.email}
                    disabled={loading}
                />
                <Input
                    label="Contraseña"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={handlePasswordChange}
                    error={errors.password}
                    disabled={loading}
                />

                {/* Requisitos de contraseña - Heurística de Nielsen: Prevención de errores */}
                {showPasswordRequirements && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2 font-body">
                            La contraseña debe contener:
                        </p>
                        <ul className="space-y-1">
                            <RequirementItem
                                text="Mínimo 8 caracteres"
                                met={getPasswordRequirements().minLength}
                            />
                            <RequirementItem
                                text="Una mayúscula"
                                met={getPasswordRequirements().hasUpperCase}
                            />
                            <RequirementItem
                                text="Una minúscula"
                                met={getPasswordRequirements().hasLowerCase}
                            />
                            <RequirementItem
                                text="Un número"
                                met={getPasswordRequirements().hasNumber}
                            />
                            <RequirementItem
                                text="Un carácter especial (!@#$%^&*)"
                                met={getPasswordRequirements().hasSpecialChar}
                            />
                        </ul>
                    </div>
                )}
            </div>

            {/* Botón principal */}
            <Button
                type="submit"
                text="Iniciar sesión"
                variant="secondary"
                size="lg"
                loading={loading}
            />

            {/* Divisor */}
            <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-500 font-body">o continúa con</span>
                <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Botón de Google - Heurística de Nielsen: Flexibilidad y eficiencia */}
            <button
                type="button"
                className="w-full py-3 px-4 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center gap-3 font-body font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition duration-200"
                onClick={() => console.log("Login con Google")}
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
                Google
            </button>

            {/* Enlaces secundarios */}
            <div className="space-y-3 text-center text-sm">
                <p className="text-gray-600 font-body">
                    ¿No tienes una cuenta?{" "}
                    <button
                        type="button"
                        onClick={onSignUp}
                        className="text-secondary font-semibold hover:underline transition-colors font-body"
                    >
                        Crea una
                    </button>
                </p>

                <Button
                    type="button"
                    text="¿Olvidaste tu contraseña?"
                    variant="outline"
                    size="sm"
                    onClick={onForgotPassword}
                    className="!w-auto !px-4"
                />
            </div>
        </form>
    );
};

export default LoginForm;




