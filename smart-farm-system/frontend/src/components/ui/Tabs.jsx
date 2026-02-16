import clsx from 'clsx';

const Tabs = ({ tabs, activeTab, onChange, className }) => (
  <div className={clsx('flex border-b border-gray-200', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={clsx(
          'px-4 py-2.5 text-sm font-medium transition-colors relative',
          'focus:outline-none',
          activeTab === tab.value
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700',
        )}
      >
        {tab.label}
        {activeTab === tab.value && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
        )}
      </button>
    ))}
  </div>
);

export default Tabs;
