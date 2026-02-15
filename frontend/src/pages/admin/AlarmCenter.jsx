/**
 * 경보 센터
 * 전체 농장 경보 통합 모니터링
 * 10초 자동 갱신
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Button,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

/** 자동 갱신 주기 (밀리초) */
const REFRESH_INTERVAL = 10000;

/** 경보 이력 페이지당 행 수 */
const ROWS_PER_PAGE = 20;

/** 경보 유형 목록 */
const ALARM_TYPES = [
  { value: '', label: '전체' },
  { value: 'temperature', label: '온도' },
  { value: 'humidity', label: '습도' },
  { value: 'co2', label: 'CO2' },
  { value: 'soil_moisture', label: '토양수분' },
  { value: 'ph', label: 'pH' },
  { value: 'ec', label: 'EC' },
  { value: 'device_offline', label: '장치 오프라인' },
];

const AlarmCenter = () => {
  const api = useApi();
  const { user: currentUser } = useAuthStore();

  // 자동 갱신 인터벌 참조
  const intervalRef = useRef(null);

  // 요약 카운트 상태
  const [activeAlarmCount, setActiveAlarmCount] = useState(0);
  const [todayAlarmCount, setTodayAlarmCount] = useState(0);
  const [offlineFarmCount, setOfflineFarmCount] = useState(0);

  // 활성 경보 목록
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [activeLoading, setActiveLoading] = useState(false);

  // 경보 이력
  const [historyAlarms, setHistoryAlarms] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

  // 농장 목록 (필터용)
  const [farms, setFarms] = useState([]);

  // 필터 상태
  const [filterFarmId, setFilterFarmId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // 에러 상태
  const [error, setError] = useState(null);

  /** 요약 데이터 조회 (관리자 개요 API) */
  const fetchOverview = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/overview');
      const data = response.data;
      setActiveAlarmCount(data.active_alarms || 0);
      setTodayAlarmCount(data.today_alarms || 0);
      setOfflineFarmCount(data.offline_farms || 0);
    } catch (err) {
      console.error('개요 데이터 조회 실패:', err);
    }
  }, [api]);

  /** 활성 경보 목록 조회 */
  const fetchActiveAlarms = useCallback(async () => {
    setActiveLoading(true);
    try {
      const response = await api.get('/api/admin/alarms/recent', {
        params: { status: 'active' },
      });
      setActiveAlarms(response.data || []);
    } catch (err) {
      console.error('활성 경보 조회 실패:', err);
    } finally {
      setActiveLoading(false);
    }
  }, [api]);

  /** 경보 이력 조회 */
  const fetchAlarmHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = {
        page: historyPage + 1,
        limit: ROWS_PER_PAGE,
      };
      if (filterFarmId) params.farm_id = filterFarmId;
      if (filterType) params.type = filterType;
      if (filterDateFrom) params.from = filterDateFrom;
      if (filterDateTo) params.to = filterDateTo;

      // 특정 농장 선택 시 해당 농장 경보 조회, 아니면 전체 조회
      let response;
      if (filterFarmId) {
        response = await api.get(`/api/farms/${filterFarmId}/alarms`, {
          params,
        });
      } else {
        response = await api.get('/api/admin/alarms/recent', { params });
      }

      setHistoryAlarms(response.data?.items || response.data || []);
      setHistoryTotal(response.data?.total || response.data?.length || 0);
    } catch (err) {
      console.error('경보 이력 조회 실패:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [api, historyPage, filterFarmId, filterType, filterDateFrom, filterDateTo]);

  /** 농장 목록 조회 */
  const fetchFarms = useCallback(async () => {
    try {
      const response = await api.get('/api/farms');
      setFarms(response.data || []);
    } catch (err) {
      console.error('농장 목록 조회 실패:', err);
    }
  }, [api]);

  /** 모든 데이터 새로고침 */
  const refreshAll = useCallback(() => {
    fetchOverview();
    fetchActiveAlarms();
    fetchAlarmHistory();
  }, [fetchOverview, fetchActiveAlarms, fetchAlarmHistory]);

  /** 초기 데이터 로드 및 자동 갱신 설정 */
  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  /** 10초 자동 갱신 설정 */
  useEffect(() => {
    // 즉시 한 번 실행
    refreshAll();

    // 자동 갱신 인터벌 설정
    intervalRef.current = setInterval(() => {
      refreshAll();
    }, REFRESH_INTERVAL);

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshAll]);

  /** 필터 변경 시 이력 재조회 */
  useEffect(() => {
    fetchAlarmHistory();
  }, [fetchAlarmHistory]);

  /** 경보 해제 처리 */
  const handleResolveAlarm = async (alarm) => {
    try {
      await api.put(`/api/farms/${alarm.farm_id}/alarms/${alarm.id}/resolve`);
      // 데이터 새로고침
      fetchOverview();
      fetchActiveAlarms();
      fetchAlarmHistory();
    } catch (err) {
      console.error('경보 해제 실패:', err);
      setError('경보 해제에 실패했습니다.');
    }
  };

  /** 이력 페이지 변경 */
  const handleChangePage = (event, newPage) => {
    setHistoryPage(newPage);
  };

  /** 날짜/시간 포매팅 */
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return '-';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 페이지 헤더 */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        경보 센터
      </Typography>

      {/* 에러 알림 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 요약 카드 3개 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* 활성 경보 카드 */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              backgroundColor: activeAlarmCount > 0 ? '#ffebee' : '#fff',
              border: activeAlarmCount > 0 ? '1px solid #ef5350' : '1px solid #e0e0e0',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <NotificationsActiveIcon
                sx={{
                  fontSize: 40,
                  color: activeAlarmCount > 0 ? '#d32f2f' : '#9e9e9e',
                }}
              />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  활성 경보
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {activeAlarmCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 오늘 경보 카드 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ border: '1px solid #e0e0e0' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningAmberIcon sx={{ fontSize: 40, color: '#ff9800' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  오늘 경보
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {todayAlarmCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 오프라인 농장 카드 */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              backgroundColor: offlineFarmCount > 0 ? '#fff3e0' : '#fff',
              border: offlineFarmCount > 0 ? '1px solid #ff9800' : '1px solid #e0e0e0',
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WifiOffIcon
                sx={{
                  fontSize: 40,
                  color: offlineFarmCount > 0 ? '#e65100' : '#9e9e9e',
                }}
              />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  오프라인 농장
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {offlineFarmCount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 활성 경보 섹션 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            활성 경보
          </Typography>
          <Badge badgeContent={activeAlarmCount} color="error" />
        </Box>

        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>농장명</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>값</TableCell>
                <TableCell>기준</TableCell>
                <TableCell>발생시각</TableCell>
                <TableCell>메시지</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : activeAlarms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography color="text.secondary">
                        활성 경보가 없습니다.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                activeAlarms.map((alarm) => (
                  <TableRow
                    key={alarm.id}
                    sx={{
                      borderLeft: '4px solid #d32f2f',
                      '&:hover': { backgroundColor: '#fff5f5' },
                    }}
                  >
                    <TableCell>{alarm.farm_name}</TableCell>
                    <TableCell>
                      <Chip label={alarm.type} size="small" color="error" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold" color="error">
                        {alarm.value}
                      </Typography>
                    </TableCell>
                    <TableCell>{alarm.threshold}</TableCell>
                    <TableCell>{formatDateTime(alarm.created_at)}</TableCell>
                    <TableCell>{alarm.message}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleResolveAlarm(alarm)}
                      >
                        해제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* 경보 이력 섹션 */}
      <Box>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          경보 이력
        </Typography>

        {/* 필터 행 */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* 농장 선택 필터 */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>농장</InputLabel>
                <Select
                  value={filterFarmId}
                  onChange={(e) => {
                    setFilterFarmId(e.target.value);
                    setHistoryPage(0); // 필터 변경 시 페이지 초기화
                  }}
                  label="농장"
                >
                  <MenuItem value="">전체</MenuItem>
                  {farms.map((farm) => (
                    <MenuItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 유형 선택 필터 */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>유형</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setHistoryPage(0);
                  }}
                  label="유형"
                >
                  {ALARM_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 기간 시작일 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="시작일"
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setHistoryPage(0);
                }}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* 기간 종료일 */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="종료일"
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setHistoryPage(0);
                }}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* 경보 이력 테이블 */}
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>농장명</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>값</TableCell>
                <TableCell>기준</TableCell>
                <TableCell>발생시각</TableCell>
                <TableCell>해제시각</TableCell>
                <TableCell>메시지</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : historyAlarms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      경보 이력이 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                historyAlarms.map((alarm) => (
                  <TableRow key={alarm.id} hover>
                    <TableCell>{alarm.farm_name}</TableCell>
                    <TableCell>
                      <Chip label={alarm.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{alarm.value}</TableCell>
                    <TableCell>{alarm.threshold}</TableCell>
                    <TableCell>{formatDateTime(alarm.created_at)}</TableCell>
                    <TableCell>{formatDateTime(alarm.resolved_at)}</TableCell>
                    <TableCell>{alarm.message}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <TablePagination
            component="div"
            count={historyTotal}
            page={historyPage}
            onPageChange={handleChangePage}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / 총 ${count !== -1 ? count : `${to}+`}건`
            }
          />
        </TableContainer>
      </Box>
    </Box>
  );
};

export default AlarmCenter;
