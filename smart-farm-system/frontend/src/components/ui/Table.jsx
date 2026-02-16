import clsx from 'clsx';

export const Table = ({ children, className }) => (
  <div className={clsx('overflow-x-auto rounded-lg border border-gray-200', className)}>
    <table className="w-full text-sm text-left">
      {children}
    </table>
  </div>
);

export const Thead = ({ children }) => (
  <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
    {children}
  </thead>
);

export const Th = ({ children, className, ...props }) => (
  <th className={clsx('px-4 py-3 whitespace-nowrap', className)} {...props}>
    {children}
  </th>
);

export const Tbody = ({ children }) => (
  <tbody className="divide-y divide-gray-100">
    {children}
  </tbody>
);

export const Tr = ({ children, className, highlight, onClick, ...props }) => (
  <tr
    className={clsx(
      'transition-colors',
      highlight ? 'bg-danger-50' : 'hover:bg-gray-50',
      onClick && 'cursor-pointer',
      className,
    )}
    onClick={onClick}
    {...props}
  >
    {children}
  </tr>
);

export const Td = ({ children, className, ...props }) => (
  <td className={clsx('px-4 py-3 text-gray-700 whitespace-nowrap', className)} {...props}>
    {children}
  </td>
);

export default Table;
