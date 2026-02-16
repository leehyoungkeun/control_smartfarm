import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, size = 'md', className }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose?.()}
    >
      <div
        className={clsx(
          'bg-white rounded-2xl shadow-xl w-full animate-in fade-in zoom-in-95',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

export const ModalFooter = ({ children, className }) => (
  <div className={clsx('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100', className)}>
    {children}
  </div>
);

export default Modal;
