import clsx from 'clsx';

const variants = {
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  danger: 'bg-danger-50 text-danger-700 border-danger-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

const sizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const Badge = ({ variant = 'gray', size = 'md', dot, children, className }) => (
  <span
    className={clsx(
      'inline-flex items-center font-medium rounded-full border gap-1',
      variants[variant],
      sizes[size],
      className,
    )}
  >
    {dot && (
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        variant === 'success' && 'bg-success-500',
        variant === 'danger' && 'bg-danger-500',
        variant === 'warning' && 'bg-warning-500',
        variant === 'primary' && 'bg-primary-500',
        variant === 'gray' && 'bg-gray-400',
      )} />
    )}
    {children}
  </span>
);

export default Badge;
