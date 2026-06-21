import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  touched?: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder = '••••••••',
  error,
  touched = false,
  showPassword,
  onTogglePassword,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm
            bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
            ${touched && error
              ? 'border-red-400 ring-2 ring-red-100'
              : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
            }`}
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {touched && error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
};

export default PasswordInput;
