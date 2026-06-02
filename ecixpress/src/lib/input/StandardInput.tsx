import type { InputHTMLAttributes } from "react";
import { motion } from "framer-motion";

interface StandardInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

const StandardInput = ({
  label,
  type = "text",
  error,
  touched = false,
  className = "",
  ...props
}: StandardInputProps) => {
  const hasError = error && touched;

  return (
    <motion.div
      className="flex flex-col gap-2 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type={type}
        className={`
          h-[50px] px-4 rounded-2xl bg-[#f1f1f1] border-2 border-transparent
          focus:outline-none focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/20
          transition duration-200 placeholder:text-gray-400 font-medium
          ${hasError ? "border-red-500 bg-red-50" : ""}
          ${className}
        `}
        {...props}
      />
      {hasError && (
        <motion.span
          className="text-xs text-red-500 font-semibold"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error}
        </motion.span>
      )}
    </motion.div>
  );
};

export default StandardInput;
