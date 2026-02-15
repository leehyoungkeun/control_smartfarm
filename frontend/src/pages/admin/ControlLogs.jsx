/**
 * 제어 로그 페이지
 * 전체 농장의 원격/자동 제어 이력 조회
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import useApi from '../../hooks/useApi';
import useAuthStore from '../../store/authStore';

/** 페이지당 행 수 */
const ROWS_PER_PAGE = 20;

/** 명령 유형 목록 */
const COMMAND_TYPES = [
  { value: '', label: '전체' },
  { value: 'EMERGENCY_STOP', label: '긴급 정지' },
  { value: 'START', label: '시작' },
  { value: 'STOP', label: '정지' },
  { value: 'MANUAL', label: '수동 제어' },
  { value: 'CONFIG_UPDATE', label: '설정 변경' },
  { value: 'UPDATE_PROGRAM', label: '프로그램 업데이트' },
];

/** 출처 유형 목록 */
const SOURCE_TYPES = [
  { value: '', label: '전체' },
  { value: 'touchpanel', label: '터치패널' },
  { value: 'web_remote', label: '웹 원격' },
  { value: 'auto_schedule', label: '자동 스케줄' },
  { value: 'auto_alarm', label: '자동 경보' },
];

/** 명령 유형별 Chip 색상 */
const COMMAND_CHIP_COLORS = {
  EMERGENCY_STOP: 'error',
  START: 'success',
  STOP: 'default',
  MANUAL: 'primary',
  CONFIG_UPDATE: 'info',
  UPDATE_PROGRAM: 'secondary',
};

/** 출처별 Chip 색상 */
const SOURCE_CHIP_COLORS = {
  touchpanel: 'warning',
  web_remote: 'primary',
  auto_schedule: 'success',
  auto_alarm: 'error',
};

/** 출처 한글 라벨 매핑 */
const SOURCE_LABELS = {
  touchpanel: '터치패널',
  web_remote: '웹 원격',
  auto_schedule: '자동 스케줄',
  auto_alarm: '자동 경보',
};

/** 명령 유형 한글 라벨 매핑 */
const COMMAND_LABELS = {
  EMERGENCY_STOP: '긴급 정지',
  START: '시작',
  STOP: '정지',
  MANUAL: '수동 제어',
  CONFIG_UPDATE: '설정 변경',
  UPDATE_PROGRAM: '프로그램 업데이트',
};

const ControlLogs = () => {
  const api = useApi();
  const { user: currentUser } = useAuthStore();

  // 농장 및 사용자 목록 (필터 선택지)
  const [farms, setFarms] = useState([]);
  const [users, setUsers] = useState([]);

  // 필터 상태
  const [filterFarmId, setFilterFarmId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterCommandType, setFilterCommandType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // 로그 데이터 상태
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  // 상세 내용 펼침 상태 (행별)
  const [expandedRows, setExpandedRows] = useState({});

  /** 농장 목록 조회 */
  const fetchFarms = useCallback(async () => {
    try {
      const response = await api.get('/api/farms');
      setFarms(response.data || []);
    } catch (err) {
      console.error('농장 목록 조회 실패:', err);
    }
  }, [api]);

  /** 사용자 목록 조회 */
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err);
    }
  }, [api]);

  /** 초기 데이터 로드 (농장, 사용자 목록) */
  useEffect(() => {
    fetchFarms();
    fetchUsers();
  }, [fetchFarms, fetchUsers]);

  /** 제어 로그 조회 */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 필터 파라미터 구성
      const params = {
        page: page + 1,
        limit: ROWS_PER_PAGE,
      };
      if (filterUserId) params.user_id = filterUserId;
      if (filterCommandType) params.command_type = filterCommandType;
      if (filterSource) params.source = filterSource;
      if (filterDateFrom) params.from = filterDateFrom;
      if (filterDateTo) params.to = filterDateTo;

      let allLogs = [];
      let total = 0;

      if (filterFarmId) {
        // 특정 농장 선택 시 해당 농장만 조회
        const response = await api.get(`/api/farms/${filterFarmId}/control-logs`, {
          params,
        });
        allLogs = response.data?.items || response.data || [];
        total = response.data?.total || allLogs.length;
      } else {
        // 전체 농장 로그 조회 (각 농장별 병렬 요청)
        const farmResponses = await Promise.all(
          farms.map((farm) =>
            api
              .get(`/api/farms/${farm.id}/control-logs`, { params })
              .then((res) => ({
                farmId: farm.id,
                farmName: farm.name,
                data: res.data?.items || res.data || [],
                total: res.data?.total || 0,
              }))
              .catch(() => ({
                farmId: farm.id,
                farmName: farm.name,
                data: [],
                total: 0,
              }))
          )
        );

        // 모든 농장의 로그 합산
        farmResponses.forEach((res) => {
          const logsWithFarm = res.data.map((log) => ({
            ...log,
            farm_name: log.farm_name || res.farmName,
          }));
          allLogs = [...allLogs, ...logsWithFarm];
          total += res.total;
        });

        // 시각 기준 내림차순 정렬
        allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // 페이지네이션 적용 (클라이언트 사이드)
        allLogs = allLogs.slice(
          page * ROWS_PER_PAGE,
          (page + 1) * ROWS_PER_PAGE
        );
      }

      setLogs(allLogs);
      setTotalCount(total);
    } catch (err) {
      console.error('제어 로그 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [api, farms, page, filterFarmId, filterUserId, filterCommandType, filterSource, filterDateFrom, filterDateTo]);

  /** 조회 버튼 클릭 핸들러 */
  const handleSearch = () => {
    setPage(0); // 검색 시 첫 페이지로 초기화
    fetchLogs();
  };

  /** 페이지 변경 핸들러 */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /** 페이지 변경 시 데이터 재조회 */
  useEffect(() => {
    if (farms.length > 0) {
      fetchLogs();
    }
  }, [page, farms.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 상세 내용 펼침/접기 토글 */
  const toggleRowExpand = (logId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  /** 상세 내용 요약 표시 (50자까지) */
  const renderDetail = (log) => {
    const detail = log.detail || log.details || '-';
    if (typeof detail !== 'string') return JSON.stringify(detail).slice(0, 50);

    const isLong = detail.length > 50;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {expandedRows[log.id] ? detail : detail.slice(0, 50)}
            {isLong && !expandedRows[log.id] && '...'}
          </Typography>
          {isLong && (
            <IconButton size="small" onClick={() => toggleRowExpand(log.id)}>
              {expandedRows[log.id] ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>
          )}
        </Box>
      </Box>
    );
  };

  /** CSV 다운로드 처리 */
  const handleDownloadCSV = () => {
    if (logs.length === 0) return;

    // CSV 헤더
    const headers = ['시각', '농장', '사용자', '명령', '상세', '출처', '결과'];

    // CSV 행 데이터 생성
    const rows = logs.map((log) => [
      formatDateTime(log.created_at),
      log.farm_name || '',
      log.username || log.user_name || '',
      COMMAND_LABELS[log.command_type] || log.command_type || '',
      (log.detail || log.details || '').replace(/"/g, '""'), // 쌍따옴표 이스케이프
      SOURCE_LABELS[log.source] || log.source || '',
      log.result === 'success' ? '성공' : '실패',
    ]);

    // BOM 추가 (한글 엑셀 호환을 위해)
    const BOM = '\uFEFF';
    const csvContent =
      BOM +
      headers.join(',') +
      '\n' +
      rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `제어로그_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          제어 로그
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadCSV}
          disabled={logs.length === 0}
        >
          CSV 다운로드
        </Button>
      </Box>

      {/* 필터 섹션 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* 농장 선택 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>농장</InputLabel>
              <Select
                value={filterFarmId}
                onChange={(e) => setFilterFarmId(e.target.value)}
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

          {/* 사용자 선택 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>사용자</InputLabel>
              <Select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                label="사용자"
              >
                <MenuItem value="">전체</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 명령 유형 선택 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>명령 유형</InputLabel>
              <Select
                value={filterCommandType}
                onChange={(e) => setFilterCommandType(e.target.value)}
                label="명령 유형"
              >
                {COMMAND_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 출처 선택 */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>출처</InputLabel>
              <Select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                label="출처"
              >
                {SOURCE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* 기간 시작일 */}
          <Grid item xs={12} sm={4} md={1.5}>
            <TextField
              label="시작일"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* 기간 종료일 */}
          <Grid item xs={12} sm={4} md={1.5}>
            <TextField
              label="종료일"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* 조회 버튼 */}
          <Grid item xs={12} sm={4} md={1}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              fullWidth
              sx={{ height: 40 }}
            >
              조회
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 로그 테이블 */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>시각</TableCell>
              <TableCell>농장</TableCell>
              <TableCell>사용자</TableCell>
              <TableCell>명령</TableCell>
              <TableCell sx={{ minWidth: 200 }}>상세</TableCell>
              <TableCell>출처</TableCell>
              <TableCell align="center">결과</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    조회된 제어 로그가 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell>{log.farm_name}</TableCell>
                  <TableCell>{log.username || log.user_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={COMMAND_LABELS[log.command_type] || log.command_type}
                      color={COMMAND_CHIP_COLORS[log.command_type] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{renderDetail(log)}</TableCell>
                  <TableCell>
                    <Chip
                      label={SOURCE_LABELS[log.source] || log.source}
                      color={SOURCE_CHIP_COLORS[log.source] || 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={log.result === 'success' ? '성공' : '실패'}
                      color={log.result === 'success' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 페이지네이션 */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / 총 ${count !== -1 ? count : `${to}+`}건`
          }
        />
      </TableContainer>
    </Box>
  );
};

export default ControlLogs;
