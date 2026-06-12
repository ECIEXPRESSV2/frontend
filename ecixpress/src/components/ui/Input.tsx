import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const Input = ({ label, type = "text", error, className = "", ...props }: Props) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 font-body">{label}</label>
            <input
                type={type}
                className={`px-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:outline-none focus:border-secondary focus:ring-0 transition duration-200 placeholder:text-gray-400 font-body ${
                    error ? "border-red-500 bg-red-50" : ""
                } ${className}`}
                {...props}
            />
            {error && <span className="text-xs text-red-500 font-medium font-body">{error}</span>}
        </div>
    );
};

export default Input;