import { forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  error,
  options = [],
  placeholder,
  size = 'md',
  className,
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
    touch: 'h-11 text-sm px-3',
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            'w-full rounded-lg border bg-white appearance-none pr-10 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-danger-300' : 'border-gray-300',
            sizes[size],
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
