/**
 * 앱 루트 컴포넌트
 * 접속 모드(터치패널/원격)에 따라 라우팅 분기
 */
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import theme from './theme';
import useAuthStore from './store/authStore';
import useConnectionMode from './hooks/useConnectionMode';

// 공통 페이지
import Login from './pages/Login';
import FarmSelector from './pages/FarmSelector';

// 농장 페이지
import Dashboard from './pages/farm/Dashboard';
import Settings from './pages/farm/Settings';
import ProgramDetail from './pages/farm/ProgramDetail';
import DailySummary from './pages/farm/DailySummary';
import Alarms from './pages/farm/Alarms';
import ManualControl from './pages/farm/ManualControl';

// 관리자 페이지 (원격 모드 전용)
import UserManagement from './pages/admin/UserManagement';
import FarmManagement from './pages/admin/FarmManagement';
import AlarmCenter from './pages/admin/AlarmCenter';
import ControlLogs from './pages/admin/ControlLogs';
import SystemOverview from './pages/admin/SystemOverview';

/**
 * 인증 필요 라우트 래퍼
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * 관리자 전용 라우트 래퍼
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'superadmin' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * 로컬 모드 라우트 (터치패널)
 */
const LocalRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    <Route path="/program/:programId" element={<PrivateRoute><ProgramDetail /></PrivateRoute>} />
    <Route path="/daily-summary" element={<PrivateRoute><DailySummary /></PrivateRoute>} />
    <Route path="/alarms" element={<PrivateRoute><Alarms /></PrivateRoute>} />
    <Route path="/manual" element={<PrivateRoute><ManualControl /></PrivateRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/**
 * 원격 모드 라우트 (사무실 서버 경유)
 */
const RemoteRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<PrivateRoute><FarmSelector /></PrivateRoute>} />
    {/* 농장 페이지 */}
    <Route path="/farm/:farmId" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/farm/:farmId/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
    <Route path="/farm/:farmId/program/:programId" element={<PrivateRoute><ProgramDetail /></PrivateRoute>} />
    <Route path="/farm/:farmId/daily-summary" element={<PrivateRoute><DailySummary /></PrivateRoute>} />
    <Route path="/farm/:farmId/alarms" element={<PrivateRoute><Alarms /></PrivateRoute>} />
    <Route path="/farm/:farmId/manual" element={<PrivateRoute><ManualControl /></PrivateRoute>} />
    {/* 관리자 페이지 */}
    <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
    <Route path="/admin/farms" element={<AdminRoute><FarmManagement /></AdminRoute>} />
    <Route path="/admin/alarms" element={<AdminRoute><AlarmCenter /></AdminRoute>} />
    <Route path="/admin/logs" element={<AdminRoute><ControlLogs /></AdminRoute>} />
    <Route path="/admin/overview" element={<AdminRoute><SystemOverview /></AdminRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  const mode = useConnectionMode();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {mode === 'local' ? <LocalRoutes /> : <RemoteRoutes />}
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
