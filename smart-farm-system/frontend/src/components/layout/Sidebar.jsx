/**
 * 사이드바 네비게이션 (원격 모드)
 */
import { NavLink, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Settings, Droplets, CalendarDays, AlertTriangle,
  Joystick, BarChart3, Bell, FileText, Users, Building2, LogOut, Sprout,
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useAuth from '../../hooks/useAuth';

const Sidebar = () => {
  const { farmId } = useParams();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const farmPrefix = farmId ? `/farm/${farmId}` : '';

  const farmNav = farmId ? [
    { to: `${farmPrefix}`, label: '대시보드', icon: LayoutDashboard, end: true },
    { to: `${farmPrefix}/settings`, label: '설정', icon: Settings },
    { to: `${farmPrefix}/program/1`, label: '프로그램', icon: Droplets },
    { to: `${farmPrefix}/daily-summary`, label: '일일집계', icon: CalendarDays },
    { to: `${farmPrefix}/alarms`, label: '경보 이력', icon: AlertTriangle },
    { to: `${farmPrefix}/manual`, label: '수동 제어', icon: Joystick },
  ] : [];

  const adminNav = isAdmin ? [
    { to: '/admin/overview', label: '시스템 현황', icon: BarChart3 },
    { to: '/admin/alarms', label: '경보 센터', icon: Bell },
    { to: '/admin/logs', label: '제어 로그', icon: FileText },
    { to: '/admin/users', label: '사용자 관리', icon: Users },
    { to: '/admin/farms', label: '농장 관리', icon: Building2 },
  ] : [];

  const NavItem = ({ to, label, icon: Icon, end }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <Sprout className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">스마트팜</p>
          <p className="text-[10px] text-gray-400">관수 제어 시스템</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* 홈 (농장 목록) */}
        <NavItem to="/" label="농장 목록" icon={Building2} end />

        {/* 농장 메뉴 */}
        {farmNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">농장</p>
            </div>
            {farmNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}

        {/* 관리 메뉴 */}
        {adminNav.length > 0 && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">관리</p>
            </div>
            {adminNav.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      {/* 하단: 사용자 정보 + 로그아웃 */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
