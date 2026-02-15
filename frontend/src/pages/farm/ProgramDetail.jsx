/**
 * 프로그램 상세 페이지
 * 관수 프로그램 설정 (트리거, 밸브, EC/pH, 탱크비율, 요일)
 *
 * 섹션 구성:
 * 1. 프로그램 탭 (1~6 선택)
 * 2. 트리거 설정 - 일사량, 작동간격, 시작시간
 * 3. 밸브 관수 설정 - 14개 밸브, 시간/유량 모드
 * 4. 양액 설정 - EC, pH, 탱크 비율 (A~F + Acid)
 * 5. 관수 요일 - 일~토 체크박스
 *
 * URL 패턴:
 * - 로컬: /programs/:id
 * - 원격: /farm/:farmId/programs/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Chip,
  Snackbar,
  Alert,
  Grid,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useConnectionMode from '../../hooks/useConnectionMode';
import useApi from '../../hooks/useApi';
import { VALVE_COUNT, PROGRAM_COUNT } from '../../utils/constants';

/**
 * 프로그램 데이터 기본값
 * API 응답이 없거나 불완전할 때 사용
 */
const DEFAULT_PROGRAM = {
  number: 1,
  // 트리거 설정
  trigger_solar: false,
  trigger_solar_threshold: 0,
  trigger_interval: false,
  trigger_interval_minutes: 0,
  trigger_interval_start: '06:00',
  trigger_interval_end: '18:00',
  trigger_time: false,
  trigger_times: ['', '', '', '', '', '', '', '', ''], // 9개 시작시간
  // 밸브 설정
  valve_mode: 'time', // 'time' 또는 'flow'
  valves: Array.from({ length: VALVE_COUNT }, (_, i) => ({
    number: i + 1,
    enabled: false,
    duration_seconds: 0,
    flow_target_liters: 0,
  })),
  // 양액 설정
  target_ec: 0,
  target_ph: 0,
  tank_ratios: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, Acid: 0 },
  // 관수 요일 (일~토, 인덱스 0=일요일)
  days_of_week: [false, false, false, false, false, false, false],
};

/**
 * 공통 텍스트 필드 스타일
 * 터치 최적화: 높이 44px, 폰트 14px
 */
const textFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 44,
    fontSize: 14,
  },
  '& .MuiInputLabel-root': {
    fontSize: 14,
  },
};

/**
 * 시간 입력 필드 스타일
 * 높이 40px, 터치에 적합한 크기
 */
const timeFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 40,
    fontSize: 13,
  },
};

/**
 * 요일 라벨 배열 (일요일부터)
 */
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 탱크 라벨 배열
 */
const TANK_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'Acid'];

const ProgramDetail = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const api = useApi();
  const params = useParams();

  // URL 파라미터에서 프로그램 번호와 farmId 추출
  const programId = params.id ? parseInt(params.id, 10) : 1;
  const farmId = mode === 'local' ? null : params.farmId;

  // --- 상태 관리 ---
  const [program, setProgram] = useState({ ...DEFAULT_PROGRAM, number: programId });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /**
   * API 경로 생성
   * 로컬 모드: /programs/:number
   * 원격 모드: /farms/:farmId/programs/:number
   */
  const getApiPath = useCallback(
    (num) => {
      const programNum = num || programId;
      return mode === 'local'
        ? `/programs/${programNum}`
        : `/farms/${farmId}/programs/${programNum}`;
    },
    [mode, farmId, programId]
  );

  /**
   * 프로그램 데이터 로드
   * programId가 변경될 때마다 해당 프로그램 데이터 조회
   */
  useEffect(() => {
    const loadProgram = async () => {
      try {
        setLoading(true);
        const response = await api.get(getApiPath());
        // 기본값과 병합하여 누락 필드 방지
        setProgram({
          ...DEFAULT_PROGRAM,
          ...response.data,
          // 밸브 배열이 불완전할 경우 기본값으로 채움
          valves: response.data.valves
            ? response.data.valves.map((v, i) => ({
                ...DEFAULT_PROGRAM.valves[i],
                ...v,
              }))
            : DEFAULT_PROGRAM.valves,
          // 탱크비율 객체 병합
          tank_ratios: {
            ...DEFAULT_PROGRAM.tank_ratios,
            ...(response.data.tank_ratios || {}),
          },
          // 요일 배열 보정
          days_of_week:
            response.data.days_of_week && response.data.days_of_week.length === 7
              ? response.data.days_of_week
              : DEFAULT_PROGRAM.days_of_week,
          // 시작시간 배열 보정 (항상 9개 유지)
          trigger_times:
            response.data.trigger_times && response.data.trigger_times.length === 9
              ? response.data.trigger_times
              : DEFAULT_PROGRAM.trigger_times,
        });
      } catch (error) {
        console.error('프로그램 로드 실패:', error);
        setSnackbar({
          open: true,
          message: '프로그램을 불러오는데 실패했습니다.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    loadProgram();
  }, [api, getApiPath, programId]);

  /**
   * 프로그램 탭 클릭 핸들러
   * 해당 프로그램 페이지로 네비게이션
   */
  const handleTabClick = (num) => {
    if (mode === 'local') {
      navigate(`/programs/${num}`);
    } else {
      navigate(`/farm/${farmId}/programs/${num}`);
    }
  };

  /**
   * 최상위 필드 변경 핸들러
   */
  const handleChange = useCallback((field, value) => {
    setProgram((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * 숫자 필드 변경 핸들러
   */
  const handleNumberChange = useCallback((field, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setProgram((prev) => ({ ...prev, [field]: numValue }));
  }, []);

  /**
   * 밸브 설정 변경 핸들러
   * 밸브 인덱스와 필드명으로 특정 밸브의 값 업데이트
   */
  const handleValveChange = useCallback((index, field, value) => {
    setProgram((prev) => {
      const newValves = [...prev.valves];
      newValves[index] = { ...newValves[index], [field]: value };
      return { ...prev, valves: newValves };
    });
  }, []);

  /**
   * 탱크 비율 변경 핸들러
   */
  const handleTankRatioChange = useCallback((tankKey, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setProgram((prev) => ({
      ...prev,
      tank_ratios: { ...prev.tank_ratios, [tankKey]: numValue },
    }));
  }, []);

  /**
   * 시작시간 배열 변경 핸들러
   * 인덱스로 특정 시간 슬롯 업데이트
   */
  const handleTriggerTimeChange = useCallback((index, value) => {
    setProgram((prev) => {
      const newTimes = [...prev.trigger_times];
      newTimes[index] = value;
      return { ...prev, trigger_times: newTimes };
    });
  }, []);

  /**
   * 요일 토글 핸들러
   */
  const handleDayToggle = useCallback((index) => {
    setProgram((prev) => {
      const newDays = [...prev.days_of_week];
      newDays[index] = !newDays[index];
      return { ...prev, days_of_week: newDays };
    });
  }, []);

  /**
   * 저장 핸들러
   * PUT 요청으로 프로그램 설정을 서버에 전송
   */
  const handleSave = async () => {
    try {
      await api.put(getApiPath(), program);
      setSnackbar({
        open: true,
        message: '프로그램이 저장되었습니다.',
        severity: 'success',
      });
    } catch (error) {
      console.error('프로그램 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '프로그램 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  /**
   * 닫기 핸들러
   */
  const handleClose = () => {
    navigate(-1);
  };

  /**
   * 스낵바 닫기 핸들러
   */
  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'auto', // 세로 스크롤 허용
        backgroundColor: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 헤더 영역 ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          minHeight: 48,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: 18 }}>
          프로그램 설정
        </Typography>
        <IconButton onClick={handleClose} aria-label="닫기">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ── 메인 콘텐츠 영역 ── */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* ================================================================ */}
        {/* 프로그램 탭 (1~6) */}
        {/* 6개 버튼을 1행에 균등 배치, 활성 탭은 채워진 스타일 */}
        {/* ================================================================ */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: PROGRAM_COUNT }, (_, i) => i + 1).map((num) => (
            <Button
              key={num}
              variant={programId === num ? 'contained' : 'outlined'}
              onClick={() => handleTabClick(num)}
              sx={{
                flex: 1,
                height: 40,
                minWidth: 0,
                fontSize: 14,
                fontWeight: programId === num ? 'bold' : 'normal',
              }}
            >
              {num}
            </Button>
          ))}
        </Box>

        {/* ================================================================ */}
        {/* 섹션 1: 트리거 설정 */}
        {/* 일사량, 작동간격, 시작시간 3가지 트리거 유형 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1.5 }}>
              트리거 설정
            </Typography>

            {/* ── 일사량 트리거 ── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!program.trigger_solar}
                    onChange={(e) => handleChange('trigger_solar', e.target.checked)}
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }}
                  />
                }
                label={<Typography sx={{ fontSize: 14 }}>일사량</Typography>}
                sx={{ minHeight: 44, mr: 1 }}
              />
              <TextField
                label="임계값 (W/m²)"
                type="number"
                variant="outlined"
                size="medium"
                value={program.trigger_solar_threshold}
                onChange={(e) =>
                  handleNumberChange('trigger_solar_threshold', e.target.value)
                }
                disabled={!program.trigger_solar}
                sx={{ ...textFieldSx, flex: 1, maxWidth: 200 }}
              />
            </Box>

            {/* ── 작동간격 트리거 ── */}
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!program.trigger_interval}
                      onChange={(e) => handleChange('trigger_interval', e.target.checked)}
                      sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 14 }}>작동간격</Typography>}
                  sx={{ minHeight: 44, mr: 1 }}
                />
                <TextField
                  label="간격 (분)"
                  type="number"
                  variant="outlined"
                  size="medium"
                  value={program.trigger_interval_minutes}
                  onChange={(e) =>
                    handleNumberChange('trigger_interval_minutes', e.target.value)
                  }
                  disabled={!program.trigger_interval}
                  sx={{ ...textFieldSx, width: 120 }}
                />
              </Box>
              {/* 시작~종료 시간 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 4 }}>
                <TextField
                  label="시작"
                  type="time"
                  variant="outlined"
                  size="medium"
                  value={program.trigger_interval_start}
                  onChange={(e) => handleChange('trigger_interval_start', e.target.value)}
                  disabled={!program.trigger_interval}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...timeFieldSx, width: 140 }}
                />
                <Typography sx={{ fontSize: 14, color: '#757575' }}>~</Typography>
                <TextField
                  label="종료"
                  type="time"
                  variant="outlined"
                  size="medium"
                  value={program.trigger_interval_end}
                  onChange={(e) => handleChange('trigger_interval_end', e.target.value)}
                  disabled={!program.trigger_interval}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...timeFieldSx, width: 140 }}
                />
              </Box>
            </Box>

            {/* ── 시작시간 트리거 ── */}
            {/* 9개 시간 입력 필드를 3×3 그리드로 배치 */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!program.trigger_time}
                    onChange={(e) => handleChange('trigger_time', e.target.checked)}
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 24 } }}
                  />
                }
                label={<Typography sx={{ fontSize: 14 }}>시작시간</Typography>}
                sx={{ minHeight: 44, mb: 0.5 }}
              />
              <Grid container spacing={1} sx={{ pl: 4 }}>
                {Array.from({ length: 9 }, (_, i) => (
                  <Grid item xs={4} key={i}>
                    <TextField
                      type="time"
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={program.trigger_times[i] || ''}
                      onChange={(e) => handleTriggerTimeChange(i, e.target.value)}
                      disabled={!program.trigger_time}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ style: { fontSize: 13 } }}
                      sx={{
                        '& .MuiOutlinedInput-root': { height: 40 },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 섹션 2: 밸브 관수 설정 */}
        {/* 시간/유량 모드 선택 + 14개 밸브 체크박스 & 값 입력 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1 }}>
              밸브 관수 설정
            </Typography>

            {/* 시간/유량 모드 라디오 선택 */}
            <RadioGroup
              row
              value={program.valve_mode}
              onChange={(e) => handleChange('valve_mode', e.target.value)}
              sx={{ mb: 1.5 }}
            >
              <FormControlLabel
                value="time"
                control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }} />}
                label={<Typography sx={{ fontSize: 14 }}>시간 모드</Typography>}
                sx={{ minHeight: 44 }}
              />
              <FormControlLabel
                value="flow"
                control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }} />}
                label={<Typography sx={{ fontSize: 14 }}>유량 모드</Typography>}
                sx={{ minHeight: 44 }}
              />
            </RadioGroup>

            {/* 14개 밸브 그리드 (4열 배치) */}
            <Grid container spacing={1}>
              {program.valves.map((valve, index) => (
                <Grid item xs={3} key={index}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      height: 48,
                    }}
                  >
                    {/* 밸브 번호 뱃지 */}
                    <Chip
                      label={`V${String(index + 1).padStart(2, '0')}`}
                      size="small"
                      color={valve.enabled ? 'primary' : 'default'}
                      sx={{ fontSize: 11, height: 24, minWidth: 40 }}
                    />
                    {/* 밸브 활성 체크박스 */}
                    <Checkbox
                      checked={!!valve.enabled}
                      onChange={(e) =>
                        handleValveChange(index, 'enabled', e.target.checked)
                      }
                      sx={{
                        p: 0.5,
                        '& .MuiSvgIcon-root': { fontSize: 20 },
                      }}
                    />
                    {/* 값 입력 (시간 또는 유량) */}
                    <TextField
                      type="number"
                      variant="outlined"
                      size="small"
                      value={
                        program.valve_mode === 'time'
                          ? valve.duration_seconds
                          : valve.flow_target_liters
                      }
                      onChange={(e) => {
                        const field =
                          program.valve_mode === 'time'
                            ? 'duration_seconds'
                            : 'flow_target_liters';
                        const numValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        handleValveChange(index, field, numValue);
                      }}
                      disabled={!valve.enabled}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          height: 36,
                          fontSize: 12,
                        },
                        '& .MuiOutlinedInput-input': {
                          px: 0.5,
                          textAlign: 'center',
                        },
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 섹션 3: 양액 설정 */}
        {/* EC/pH 목표값 + 7개 탱크 비율 (A~F + Acid) */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1.5 }}>
              양액 설정
            </Typography>

            {/* EC + pH 목표값 (2열) */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField
                  label="목표 EC"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={program.target_ec}
                  onChange={(e) => handleNumberChange('target_ec', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="목표 pH"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={program.target_ph}
                  onChange={(e) => handleNumberChange('target_ph', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>

            {/* 탱크 비율 (7개 필드를 1행에 배치) */}
            <Typography sx={{ fontSize: 13, color: '#757575', mb: 1 }}>
              탱크 비율
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {TANK_LABELS.map((label) => (
                <TextField
                  key={label}
                  label={label}
                  type="number"
                  variant="outlined"
                  size="small"
                  value={program.tank_ratios[label]}
                  onChange={(e) => handleTankRatioChange(label, e.target.value)}
                  inputProps={{ step: 0.1 }}
                  sx={{
                    width: 80,
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      height: 40,
                      fontSize: 13,
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12,
                    },
                    '& .MuiOutlinedInput-input': {
                      px: 0.5,
                      textAlign: 'center',
                    },
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 섹션 4: 관수 요일 */}
        {/* 일~토 7개 체크박스를 1행에 배치 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1 }}>
              관수 요일
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              {DAY_LABELS.map((label, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={!!program.days_of_week[index]}
                      onChange={() => handleDayToggle(index)}
                      sx={{
                        '& .MuiSvgIcon-root': { fontSize: 28 },
                        width: 40,
                        height: 40,
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 14, fontWeight: 'bold' }}>
                      {label}
                    </Typography>
                  }
                  labelPlacement="bottom"
                  sx={{ mx: 0 }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 하단 버튼 영역 */}
        {/* 저장 (초록색) + 닫기 (회색) */}
        {/* ================================================================ */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 2 }}>
          {/* 저장 버튼 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            sx={{
              height: 48,
              backgroundColor: '#27AE60',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#219A52' },
            }}
          >
            저장
          </Button>
          {/* 닫기 버튼 */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleClose}
            sx={{
              height: 44,
              backgroundColor: '#9E9E9E',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#757575' },
            }}
          >
            닫기
          </Button>
        </Box>
      </Box>

      {/* ── 성공/실패 알림 스낵바 ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProgramDetail;
