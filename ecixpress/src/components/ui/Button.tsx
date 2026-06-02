import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    text: string;
    variant?: "primary" | "secondary" | "outline";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: ReactNode;
}

const Button = ({
    text,
    variant = "secondary",
    size = "md",
    loading = false,
    className = "",
    disabled,
    icon,
    ...props
}: Props) => {
    const baseClasses = "font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-2 font-body";

    const variantClasses = {
        primary: "bg-primary text-white hover:bg-yellow-500 active:scale-95",
        secondary: "bg-secondary text-white hover:bg-cyan-500 active:scale-95",
        outline: "border-2 border-secondary text-secondary hover:bg-secondary hover:text-white active:scale-95",
    };

    const sizeClasses = {
        sm: "px-4 py-2 text-sm",
        md: "w-full py-3 text-base",
        lg: "w-full py-4 text-lg",
    };

    return (
        <button
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
        >
            {loading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {icon && <span>{icon}</span>}
            {text}
        </button>
    );
};

export default Button;
