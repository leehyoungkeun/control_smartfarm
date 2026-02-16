/**
 * 라우팅 설정
 * 로컬: HydroControlPro (터치패널 전체 UI)
 * 원격: FarmSelector + HydroControlPro + 관리자 페이지
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useConnectionMode from '../hooks/useConnectionMode';

import Login from '../pages/Login';
import FarmSelector from '../pages/FarmSelector';
import HydroControlPro from '../pages/farm/HydroControlPro';
import SystemOverview from '../pages/admin/SystemOverview';
import AlarmCenter from '../pages/admin/AlarmCenter';
import ControlLogs from '../pages/admin/ControlLogs';
import UserManagement from '../pages/admin/UserManagement';
import FarmManagement from '../pages/admin/FarmManagement';

/** 인증 필요 라우트 래퍼 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/** 관리자 전용 라우트 래퍼 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

/** 로컬 모드 라우트 (터치패널) — HydroControlPro가 내부 탭으로 모든 페이지 처리 */
const LocalRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><HydroControlPro /></PrivateRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/** 원격 모드 라우트 — 농장 페이지는 HydroControlPro, 관리자 페이지 유지 */
const RemoteRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><FarmSelector /></PrivateRoute>} />
    <Route path="/farm/:farmId" element={<PrivateRoute><HydroControlPro /></PrivateRoute>} />
    {/* 관리자 페이지 */}
    <Route path="/admin/overview" element={<AdminRoute><SystemOverview /></AdminRoute>} />
    <Route path="/admin/alarms" element={<AdminRoute><AlarmCenter /></AdminRoute>} />
    <Route path="/admin/logs" element={<AdminRoute><ControlLogs /></AdminRoute>} />
    <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
    <Route path="/admin/farms" element={<AdminRoute><FarmManagement /></AdminRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const AppRoutes = () => {
  const { isLocal } = useConnectionMode();
  return isLocal ? <LocalRoutes /> : <RemoteRoutes />;
};

export default AppRoutes;
