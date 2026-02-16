import clsx from 'clsx';

export const Card = ({ children, className, padding = true, ...props }) => (
  <div
    className={clsx(
      'bg-white rounded-xl border border-gray-100 shadow-sm',
      padding && 'p-5',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, className }) => (
  <div className={clsx('flex items-center justify-between mb-4', className)}>
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export default Card;
