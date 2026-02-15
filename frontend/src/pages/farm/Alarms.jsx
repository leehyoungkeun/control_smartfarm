/**
 * 경보 조회 페이지
 * 경보 이력 목록 (페이지네이션)
 *
 * 구조:
 * - 상단: 페이지 제목 + 닫기 버튼
 * - 경보 테이블: 발생시각, 유형, 측정값, 기준값, 해제시각, 메시지
 * - 페이지네이션: 이전/다음 버튼 + 페이지 표시
 * - 하단: 닫기 버튼
 *
 * 활성 경보(해제시각 없음): 연한 빨간색 배경
 * 해제된 경보: 일반 배경
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import useConnectionMode from '../../hooks/useConnectionMode';
import useApi from '../../hooks/useApi';

/** 페이지당 표시할 경보 건수 */
const PAGE_LIMIT = 20;

const Alarms = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const params = useParams();
  const farmId = mode === 'local' ? null : params.farmId;
  const api = useApi();

  // --- 상태 관리 ---
  const [alarms, setAlarms] = useState([]);        // 현재 페이지의 경보 목록
  const [page, setPage] = useState(1);              // 현재 페이지 번호
  const [totalPages, setTotalPages] = useState(1);  // 전체 페이지 수
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 경보 데이터 조회
   * 로컬/원격 모드에 따라 API 경로 분기
   * @param {number} pageNum - 조회할 페이지 번호
   */
  const fetchAlarms = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      // 접속 모드에 따른 API 경로 결정
      const basePath = mode === 'remote' && farmId
        ? `/farms/${farmId}/alarms`
        : '/alarms';
      const response = await api.get(basePath, {
        params: { page: pageNum, limit: PAGE_LIMIT },
      });
      const data = response.data;

      setAlarms(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('경보 데이터 조회 실패:', err);
      setError('경보 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, mode, farmId]);

  // 페이지 변경 시 데이터 재조회
  useEffect(() => {
    fetchAlarms(page);
  }, [page, fetchAlarms]);

  /**
   * 페이지 닫기 (대시보드로 이동)
   */
  const handleClose = () => {
    if (mode === 'remote' && farmId) {
      navigate(`/farm/${farmId}`);
    } else {
      navigate('/');
    }
  };

  /** 이전 페이지로 이동 */
  const handlePrevPage = () => {
    if (page > 1) setPage((prev) => prev - 1);
  };

  /** 다음 페이지로 이동 */
  const handleNextPage = () => {
    if (page < totalPages) setPage((prev) => prev + 1);
  };

  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 헤더: 페이지 제목 + 닫기 버튼 ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '48px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          px: 2,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', color: '#212121' }}>
          경보 조회
        </Typography>
        <IconButton onClick={handleClose} sx={{ width: 44, height: 44 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ── 콘텐츠 영역 ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* ── 에러 메시지 ── */}
        {error && (
          <Typography sx={{ color: '#E74C3C', fontSize: 13, mb: 1 }}>
            {error}
          </Typography>
        )}

        {/* ── 로딩 표시 ── */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {/* ── 경보 테이블 ── */}
        {!loading && (
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#2E75B6' }}>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    발생시각
                  </TableCell>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    유형
                  </TableCell>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    측정값
                  </TableCell>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    기준값
                  </TableCell>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    해제시각
                  </TableCell>
                  <TableCell sx={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    메시지
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alarms.length === 0 ? (
                  // 데이터 없음 표시
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, fontSize: 13 }}>
                      경보 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  alarms.map((alarm, index) => {
                    // 활성 경보 여부 (해제시각이 없으면 활성)
                    const isActive = !alarm.resolved_at;
                    return (
                      <TableRow
                        key={alarm.id || index}
                        sx={{
                          backgroundColor: isActive ? '#FFEBEE' : 'inherit',
                        }}
                      >
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {alarm.occurred_at || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {alarm.type || '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {alarm.measured_value ?? '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {alarm.threshold_value ?? '-'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {alarm.resolved_at || '미해제'}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {alarm.message || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── 페이지네이션 ── */}
        {!loading && alarms.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            {/* 이전 페이지 버튼 */}
            <Button
              variant="outlined"
              onClick={handlePrevPage}
              disabled={page <= 1}
              sx={{
                height: 44,
                flex: 1,
                maxWidth: 160,
                fontWeight: 'bold',
              }}
            >
              이전
            </Button>

            {/* 현재 페이지 / 전체 페이지 표시 */}
            <Typography sx={{ fontSize: 14, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {page} / {totalPages} 페이지
            </Typography>

            {/* 다음 페이지 버튼 */}
            <Button
              variant="outlined"
              onClick={handleNextPage}
              disabled={page >= totalPages}
              sx={{
                height: 44,
                flex: 1,
                maxWidth: 160,
                fontWeight: 'bold',
              }}
            >
              다음
            </Button>
          </Box>
        )}
      </Box>

      {/* ── 하단 닫기 버튼 ── */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleClose}
          sx={{
            height: 44,
            backgroundColor: '#9E9E9E',
            color: '#FFFFFF',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#757575' },
          }}
        >
          닫기
        </Button>
      </Box>
    </Box>
  );
};

export default Alarms;
