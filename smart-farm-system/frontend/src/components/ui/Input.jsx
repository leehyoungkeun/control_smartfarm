import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  type = 'text',
  size = 'md',
  className,
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-8 text-xs px-2.5',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
    touch: 'h-11 text-sm px-3 min-w-[44px]',
  };

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'w-full rounded-lg border bg-white transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-danger-300 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300',
            icon ? 'pl-10' : '',
            sizes[size],
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
