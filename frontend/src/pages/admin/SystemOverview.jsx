/**
 * 시스템 개요 페이지
 * 전체 시스템 현황 대시보드
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

const SystemOverview = () => {
  const api = useApi();
  const { user: currentUser } = useAuthStore();

  // 요약 데이터 상태
  const [overview, setOverview] = useState({
    total_farms: 0,
    online_farms: 0,
    offline_farms: 0,
    active_alarms: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 오프라인 농장 목록
  const [offlineFarms, setOfflineFarms] = useState([]);
  const [offlineLoading, setOfflineLoading] = useState(false);

  // 최근 경보 데이터 (차트용)
  const [recentAlarms, setRecentAlarms] = useState([]);
  const [alarmsLoading, setAlarmsLoading] = useState(false);

  /** 시스템 개요 데이터 조회 */
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/admin/overview');
      setOverview({
        total_farms: response.data.total_farms || 0,
        online_farms: response.data.online_farms || 0,
        offline_farms: response.data.offline_farms || 0,
        active_alarms: response.data.active_alarms || 0,
      });
    } catch (err) {
      setError('시스템 개요 데이터를 불러오는데 실패했습니다.');
      console.error('시스템 개요 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /** 오프라인 농장 목록 조회 */
  const fetchOfflineFarms = useCallback(async () => {
    setOfflineLoading(true);
    try {
      const response = await api.get('/api/admin/farms/offline');
      setOfflineFarms(response.data || []);
    } catch (err) {
      console.error('오프라인 농장 조회 실패:', err);
    } finally {
      setOfflineLoading(false);
    }
  }, [api]);

  /** 최근 경보 데이터 조회 (7일 추이 차트용) */
  const fetchRecentAlarms = useCallback(async () => {
    setAlarmsLoading(true);
    try {
      const response = await api.get('/api/admin/alarms/recent');
      setRecentAlarms(response.data || []);
    } catch (err) {
      console.error('최근 경보 조회 실패:', err);
    } finally {
      setAlarmsLoading(false);
    }
  }, [api]);

  /** 초기 데이터 로드 */
  useEffect(() => {
    fetchOverview();
    fetchOfflineFarms();
    fetchRecentAlarms();
  }, [fetchOverview, fetchOfflineFarms, fetchRecentAlarms]);

  /**
   * 7일 경보 추이 차트 데이터 생성
   * 최근 경보 데이터를 날짜별로 그룹핑
   */
  const chartData = useMemo(() => {
    // 최근 7일 날짜 배열 생성
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: 0,
      });
    }

    // 경보 데이터를 날짜별로 카운팅
    if (recentAlarms && recentAlarms.length > 0) {
      recentAlarms.forEach((alarm) => {
        const alarmDate = alarm.created_at
          ? new Date(alarm.created_at).toISOString().split('T')[0]
          : null;
        if (alarmDate) {
          const dayEntry = days.find((d) => d.date === alarmDate);
          if (dayEntry) {
            dayEntry.count += 1;
          }
        }
      });
    }

    return days;
  }, [recentAlarms]);

  /** 마지막 접속 시간 포매팅 */
  const formatLastConnection = (dateString) => {
    if (!dateString) return '정보 없음';
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return '정보 없음';
    }
  };

  /** 요약 카드 설정 */
  const summaryCards = [
    {
      title: '총 농장',
      value: overview.total_farms,
      icon: <AgricultureIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      bgColor: '#e3f2fd',
      borderColor: '#1976d2',
    },
    {
      title: '온라인',
      value: overview.online_farms,
      icon: <CloudDoneIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
      bgColor: '#e8f5e9',
      borderColor: '#2e7d32',
    },
    {
      title: '오프라인',
      value: overview.offline_farms,
      icon: <CloudOffIcon sx={{ fontSize: 40, color: overview.offline_farms > 0 ? '#d32f2f' : '#9e9e9e' }} />,
      bgColor: overview.offline_farms > 0 ? '#ffebee' : '#fafafa',
      borderColor: overview.offline_farms > 0 ? '#d32f2f' : '#e0e0e0',
      warning: overview.offline_farms > 0,
    },
    {
      title: '경보 중',
      value: overview.active_alarms,
      icon: <NotificationsActiveIcon sx={{ fontSize: 40, color: overview.active_alarms > 0 ? '#fff' : '#9e9e9e' }} />,
      bgColor: overview.active_alarms > 0 ? '#d32f2f' : '#fafafa',
      borderColor: overview.active_alarms > 0 ? '#d32f2f' : '#e0e0e0',
      textColor: overview.active_alarms > 0 ? '#fff' : undefined,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* 페이지 헤더 */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        시스템 개요
      </Typography>

      {/* 에러 알림 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 로딩 표시 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 요약 카드 4개 (Grid 레이아웃) */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {summaryCards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Card
                  sx={{
                    backgroundColor: card.bgColor,
                    border: `1px solid ${card.borderColor}`,
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-2px)' },
                  }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 2.5,
                    }}
                  >
                    {card.icon}
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: card.textColor || 'text.secondary' }}
                      >
                        {card.title}
                      </Typography>
                      <Typography
                        variant="h3"
                        fontWeight="bold"
                        sx={{ color: card.textColor || 'text.primary' }}
                      >
                        {card.value}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 오프라인 농장 알림 섹션 */}
          {overview.offline_farms > 0 && (
            <Card
              sx={{
                mb: 4,
                backgroundColor: '#fffde7',
                border: '1px solid #fbc02d',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningAmberIcon sx={{ color: '#f57f17' }} />
                  <Typography variant="h6" fontWeight="bold" color="#f57f17">
                    오프라인 농장 알림
                  </Typography>
                </Box>
                {offlineLoading ? (
                  <CircularProgress size={24} />
                ) : offlineFarms.length === 0 ? (
                  <Typography color="text.secondary">
                    오프라인 농장 상세 정보를 불러올 수 없습니다.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {offlineFarms.map((farm) => (
                      <ListItem key={farm.id} divider>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CloudOffIcon color="error" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography fontWeight="medium">
                              {farm.name}
                            </Typography>
                          }
                          secondary={`마지막 접속: ${formatLastConnection(farm.last_connection)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          )}

          {/* 7일 경보 추이 차트 */}
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              최근 7일 경보 추이
            </Typography>
            {alarmsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 13 }}
                      axisLine={{ stroke: '#bdbdbd' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 13 }}
                      axisLine={{ stroke: '#bdbdbd' }}
                      label={{
                        value: '경보 수',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 13 },
                      }}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}건`, '경보']}
                      labelFormatter={(label) => `날짜: ${label}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: 4,
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="경보 수"
                      fill="#ef5350"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default SystemOverview;
