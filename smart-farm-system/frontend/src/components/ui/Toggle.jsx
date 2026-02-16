import clsx from 'clsx';

const Toggle = ({ checked, onChange, label, disabled = false, size = 'md', className }) => {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  };

  const s = sizes[size];

  return (
    <label className={clsx('inline-flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={clsx(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200',
          s.track,
          checked ? 'bg-primary-600' : 'bg-gray-300',
        )}
      >
        <span
          className={clsx(
            'inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ml-0.5',
            s.thumb,
            checked ? s.translate : 'translate-x-0',
          )}
        />
      </button>
      {label && <span className="text-sm text-gray-700 select-none">{label}</span>}
    </label>
  );
};

export default Toggle;
