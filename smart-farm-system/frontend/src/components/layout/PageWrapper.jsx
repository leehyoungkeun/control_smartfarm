/**
 * 페이지 공통 래퍼
 * 원격 모드: Sidebar + 콘텐츠 영역
 * 로컬 모드: 전체 화면 (터치패널)
 */
import useConnectionMode from '../../hooks/useConnectionMode';
import Sidebar from './Sidebar';

const PageWrapper = ({ children }) => {
  const { isLocal } = useConnectionMode();

  if (isLocal) {
    return <div className="touch-panel">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
};

/** 페이지 헤더 (원격 모드용) */
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
    <div>
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

/** 페이지 콘텐츠 영역 */
export const PageContent = ({ children, className }) => (
  <div className={`px-8 py-6 ${className || ''}`}>
    {children}
  </div>
);

export default PageWrapper;
