import React from 'react';

interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  touched?: boolean;
  className?: string;
  min?: string | number;
  required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched = false,
  className = '',
  min,
  required = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (type === 'number') val = val.replace(/\D/g, '');
    onChange(val);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      <input
        type="text"
        inputMode={type === 'number' ? 'numeric' : undefined}
        required={required}
        aria-required={required}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        min={min}
        className={`w-full px-4 py-3 rounded-xl border text-sm
          bg-white/60 backdrop-blur-sm transition-all duration-200 outline-none
          ${touched && error
            ? 'border-red-400 ring-2 ring-red-100'
            : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
          } ${className}`}
      />
      {touched && error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
};

export default FormInput;
