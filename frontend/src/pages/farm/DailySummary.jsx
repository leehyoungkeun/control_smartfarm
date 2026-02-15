/**
 * 일일집계 페이지
 * 날짜별 프로그램 운전 결과 및 밸브 유량 조회
 *
 * 구조:
 * - 상단: 페이지 제목 + 닫기 버튼
 * - 날짜 선택: 날짜 입력 + 조회 버튼
 * - 프로그램 요약 테이블: P1~P6 동작 결과
 * - 1일 총 유량 표시
 * - 밸브별 유량 테이블: V01~V14 × P1~P6
 * - 하단: 닫기 버튼
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import useConnectionMode from '../../hooks/useConnectionMode';
import useApi from '../../hooks/useApi';

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * 프로그램 요약 테이블 공통 스타일
 */
const tableStyles = {
  // 프로그램 테이블 헤더 셀
  programHeader: {
    backgroundColor: '#2E75B6',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 'bold',
    padding: '6px 8px',
    textAlign: 'center',
    borderRight: '1px solid #B0C4DE',
    whiteSpace: 'nowrap',
  },
  // 프로그램 테이블 데이터 셀
  programCell: {
    fontSize: '13px',
    padding: '5px 8px',
    textAlign: 'center',
    borderRight: '1px solid #E0E0E0',
    borderBottom: '1px solid #E0E0E0',
  },
  // 밸브 테이블 헤더 셀
  valveHeader: {
    backgroundColor: '#2E75B6',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 6px',
    textAlign: 'center',
    borderRight: '1px solid #B0C4DE',
    whiteSpace: 'nowrap',
  },
  // 밸브 테이블 데이터 셀
  valveCell: {
    fontSize: '12px',
    padding: '3px 6px',
    textAlign: 'center',
    borderRight: '1px solid #E0E0E0',
    borderBottom: '1px solid #E0E0E0',
  },
};

const DailySummary = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const params = useParams();
  const farmId = mode === 'local' ? null : params.farmId;
  const api = useApi();

  // --- 상태 관리 ---
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 프로그램 요약 데이터 (P1~P6)
  const [programSummary, setProgramSummary] = useState([]);
  // 1일 총 유량
  const [dailyTotals, setDailyTotals] = useState({ totalIrrigation: 0, totalDrainage: 0 });
  // 밸브별 유량 데이터 (V01~V14 × P1~P6)
  const [valveFlow, setValveFlow] = useState([]);

  /**
   * 선택된 날짜의 일일집계 데이터 조회
   * 로컬/원격 모드에 따라 API 경로 분기
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 접속 모드에 따른 API 경로 결정
      const basePath = mode === 'remote' && farmId
        ? `/farms/${farmId}/daily-summary`
        : '/daily-summary';
      const response = await api.get(basePath, {
        params: { date: selectedDate },
      });
      const data = response.data;

      // 응답 데이터 매핑
      setProgramSummary(data.programSummary || []);
      setDailyTotals(data.dailyTotals || { totalIrrigation: 0, totalDrainage: 0 });
      setValveFlow(data.valveFlow || []);
    } catch (err) {
      console.error('일일집계 데이터 조회 실패:', err);
      setError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, mode, farmId, selectedDate]);

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

  // 프로그램 번호 배열 (P1~P6)
  const programs = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  // 밸브 번호 배열 (V01~V14)
  const valves = Array.from({ length: 14 }, (_, i) =>
    `V${String(i + 1).padStart(2, '0')}`
  );

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
          일일집계
        </Typography>
        <IconButton onClick={handleClose} sx={{ width: 44, height: 44 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ── 콘텐츠 영역 (스크롤 가능) ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* ── 날짜 선택 + 조회 버튼 ── */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="small"
            sx={{
              flex: 1,
              '& .MuiInputBase-root': { height: 44 },
            }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={fetchData}
            disabled={loading}
            sx={{ height: 44, minWidth: 80, fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : '조회'}
          </Button>
        </Box>

        {/* ── 에러 메시지 ── */}
        {error && (
          <Typography sx={{ color: '#E74C3C', fontSize: 13, mb: 1 }}>
            {error}
          </Typography>
        )}

        {/* ── 프로그램 요약 테이블 ── */}
        <Paper sx={{ mb: 2, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.programHeader}>프로그램</th>
                <th style={tableStyles.programHeader}>동작횟수</th>
                <th style={tableStyles.programHeader}>설정EC</th>
                <th style={tableStyles.programHeader}>실측EC</th>
                <th style={tableStyles.programHeader}>설정pH</th>
                <th style={tableStyles.programHeader}>실측pH</th>
                <th style={tableStyles.programHeader}>관수량(L)</th>
                <th style={{ ...tableStyles.programHeader, borderRight: 'none' }}>퇴수량(L)</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((program, index) => {
                // 해당 프로그램의 데이터 찾기 (없으면 기본값)
                const row = programSummary.find((r) => r.program === program) || {};
                return (
                  <tr
                    key={program}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
                    }}
                  >
                    <td style={{ ...tableStyles.programCell, fontWeight: 'bold' }}>{program}</td>
                    <td style={tableStyles.programCell}>{row.runCount ?? '-'}</td>
                    <td style={tableStyles.programCell}>{row.setEC ?? '-'}</td>
                    <td style={tableStyles.programCell}>{row.actualEC ?? '-'}</td>
                    <td style={tableStyles.programCell}>{row.setPH ?? '-'}</td>
                    <td style={tableStyles.programCell}>{row.actualPH ?? '-'}</td>
                    <td style={tableStyles.programCell}>{row.irrigationLiters ?? '-'}</td>
                    <td style={{ ...tableStyles.programCell, borderRight: 'none' }}>
                      {row.drainageLiters ?? '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Paper>

        {/* ── 1일 총 유량 표시 ── */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            p: 1.5,
            mb: 2,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 'bold' }}>
            1일 총 관수유량: {dailyTotals.totalIrrigation ?? 0} L
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 'bold' }}>
            1일 총 퇴수유량: {dailyTotals.totalDrainage ?? 0} L
          </Typography>
        </Box>

        {/* ── 밸브별 유량 테이블 ── */}
        <Paper sx={{ mb: 2, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableStyles.valveHeader}>밸브</th>
                {programs.map((p) => (
                  <th key={p} style={tableStyles.valveHeader}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {valves.map((valve, index) => {
                // 해당 밸브의 유량 데이터 찾기
                const row = valveFlow.find((r) => r.valve === valve) || {};
                return (
                  <tr
                    key={valve}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
                    }}
                  >
                    <td style={{ ...tableStyles.valveCell, fontWeight: 'bold' }}>{valve}</td>
                    {programs.map((p) => (
                      <td key={p} style={tableStyles.valveCell}>
                        {row[p] ?? '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Paper>
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

export default DailySummary;
