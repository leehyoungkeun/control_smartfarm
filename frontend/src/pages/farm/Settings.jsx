/**
 * 환경설정 페이지
 * 시스템 설정 조회/수정
 * 세로 스크롤 허용 (내용이 많음)
 *
 * 3개 섹션:
 * 1. 프로그램 사용 설정 - 6개 프로그램 토글 스위치
 * 2. 기능설정 - 양액자동공급, EC/pH 관련 설정
 * 3. 사용환경설정 - 경보 상/하한, 유량단위, 산/알카리 등
 *
 * 저장 시 PUT /api/config 또는 PUT /api/farms/:farmId/config
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Button,
  IconButton,
  Snackbar,
  Alert,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useConnectionMode from '../../hooks/useConnectionMode';
import useApi from '../../hooks/useApi';

/**
 * 설정 필드의 기본값 정의
 * API 응답이 불완전할 경우 폴백으로 사용
 */
const DEFAULT_CONFIG = {
  // 프로그램 사용 여부 (1~6)
  program_enabled_1: false,
  program_enabled_2: false,
  program_enabled_3: false,
  program_enabled_4: false,
  program_enabled_5: false,
  program_enabled_6: false,
  // 기능설정
  auto_nutrient_supply: false,
  bulk_supply_ec: 0,
  bulk_supply_ph: 0,
  precision_ec: 0,
  precision_ph: 0,
  // 사용환경설정
  acid_alkali: '산',
  flow_unit: 'L/min',
  ec_alarm_high: 0,
  ec_alarm_low: 0,
  ph_alarm_high: 0,
  ph_alarm_low: 0,
  ec_operating_low: 0,
  stirrer_time_sec: 0,
  set_temperature: 0,
  min_solar_radiation: 0,
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

const Settings = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const api = useApi();
  const params = useParams();
  const farmId = mode === 'local' ? null : params.farmId;

  // --- 상태 관리 ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /**
   * API 경로 생성
   * 로컬 모드: /config
   * 원격 모드: /farms/:farmId/config
   */
  const getApiPath = useCallback(() => {
    return mode === 'local' ? '/config' : `/farms/${farmId}/config`;
  }, [mode, farmId]);

  /**
   * 설정 데이터 로드
   * 마운트 시 GET 요청으로 현재 설정 조회
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get(getApiPath());
        // API 응답과 기본값을 병합하여 누락된 필드 방지
        setConfig({ ...DEFAULT_CONFIG, ...response.data });
      } catch (error) {
        console.error('설정 로드 실패:', error);
        setSnackbar({
          open: true,
          message: '설정을 불러오는데 실패했습니다.',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [api, getApiPath]);

  /**
   * 설정값 변경 핸들러
   * 필드명과 값을 받아 config 상태 업데이트
   */
  const handleChange = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * 숫자 필드 변경 핸들러
   * 문자열 → 숫자 변환 처리
   */
  const handleNumberChange = useCallback((field, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setConfig((prev) => ({ ...prev, [field]: numValue }));
  }, []);

  /**
   * 설정 저장 핸들러
   * PUT 요청으로 변경사항 서버에 전송
   */
  const handleSave = async () => {
    try {
      await api.put(getApiPath(), config);
      setSnackbar({
        open: true,
        message: '설정이 저장되었습니다.',
        severity: 'success',
      });
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setSnackbar({
        open: true,
        message: '설정 저장에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  /**
   * 닫기 핸들러
   * 이전 페이지로 되돌아가기
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
        overflow: 'auto', // 세로 스크롤 허용 (내용이 600px 초과)
        backgroundColor: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 헤더 영역 ── */}
      {/* "환경설정" 타이틀과 닫기(X) 버튼 */}
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
          환경설정
        </Typography>
        <IconButton onClick={handleClose} aria-label="닫기">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* ── 메인 콘텐츠 영역 ── */}
      {/* 3개 섹션 카드 + 하단 버튼 */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* ================================================================ */}
        {/* 섹션 1: 프로그램 사용 설정 */}
        {/* 6개 프로그램의 활성/비활성 토글 스위치 */}
        {/* 2열 × 3행 그리드 배치 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1.5 }}>
              프로그램 사용 설정
            </Typography>
            <Grid container spacing={1}>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <Grid item xs={6} key={num}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!config[`program_enabled_${num}`]}
                        onChange={(e) =>
                          handleChange(`program_enabled_${num}`, e.target.checked)
                        }
                        sx={{
                          // 터치 최적화: 스위치 높이 38px 이상 확보
                          '& .MuiSwitch-switchBase': { py: '9px' },
                          '& .MuiSwitch-thumb': { width: 22, height: 22 },
                          '& .MuiSwitch-track': { height: 16, borderRadius: 8 },
                          minHeight: 38,
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: 14 }}>
                        {`프로그램 ${num}`}
                      </Typography>
                    }
                    sx={{ ml: 0, minHeight: 44 }}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 섹션 2: 기능설정 */}
        {/* 양액자동공급 토글 + EC/pH 관련 수치 입력 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1.5 }}>
              기능설정
            </Typography>
            <Grid container spacing={1.5}>
              {/* 양액자동공급 토글 - 전체 너비 사용 */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!config.auto_nutrient_supply}
                      onChange={(e) =>
                        handleChange('auto_nutrient_supply', e.target.checked)
                      }
                      sx={{
                        // 큰 크기 스위치
                        transform: 'scale(1.2)',
                        '& .MuiSwitch-thumb': { width: 24, height: 24 },
                        minHeight: 38,
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 14, fontWeight: 'bold' }}>
                      양액자동공급
                    </Typography>
                  }
                  sx={{ ml: 0, minHeight: 48 }}
                />
              </Grid>
              {/* 양액다량공급 EC */}
              <Grid item xs={6}>
                <TextField
                  label="다량공급 EC"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.bulk_supply_ec}
                  onChange={(e) => handleNumberChange('bulk_supply_ec', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 양액다량공급 pH */}
              <Grid item xs={6}>
                <TextField
                  label="다량공급 pH"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.bulk_supply_ph}
                  onChange={(e) => handleNumberChange('bulk_supply_ph', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 양액정밀도 EC */}
              <Grid item xs={6}>
                <TextField
                  label="양액정밀도 EC"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.precision_ec}
                  onChange={(e) => handleNumberChange('precision_ec', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 양액정밀도 pH */}
              <Grid item xs={6}>
                <TextField
                  label="양액정밀도 pH"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.precision_ph}
                  onChange={(e) => handleNumberChange('precision_ph', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ================================================================ */}
        {/* 섹션 3: 사용환경설정 */}
        {/* 산/알카리, 유량단위, 경보 상하한, 온도, 일사량 등 */}
        {/* ================================================================ */}
        <Card>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: 15, mb: 1.5 }}>
              사용환경설정
            </Typography>
            <Grid container spacing={1.5}>
              {/* 산/알카리 선택 */}
              <Grid item xs={6}>
                <FormControl fullWidth size="medium" sx={textFieldSx}>
                  <InputLabel sx={{ fontSize: 14 }}>산/알카리</InputLabel>
                  <Select
                    value={config.acid_alkali}
                    label="산/알카리"
                    onChange={(e) => handleChange('acid_alkali', e.target.value)}
                    sx={{ height: 44, fontSize: 14 }}
                  >
                    <MenuItem value="산">산</MenuItem>
                    <MenuItem value="알카리">알카리</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* 유량단위 선택 */}
              <Grid item xs={6}>
                <FormControl fullWidth size="medium" sx={textFieldSx}>
                  <InputLabel sx={{ fontSize: 14 }}>유량단위</InputLabel>
                  <Select
                    value={config.flow_unit}
                    label="유량단위"
                    onChange={(e) => handleChange('flow_unit', e.target.value)}
                    sx={{ height: 44, fontSize: 14 }}
                  >
                    <MenuItem value="L/min">L/min</MenuItem>
                    <MenuItem value="m³/h">m³/h</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {/* EC경보 상한 */}
              <Grid item xs={6}>
                <TextField
                  label="EC경보 상한"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.ec_alarm_high}
                  onChange={(e) => handleNumberChange('ec_alarm_high', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* EC경보 하한 */}
              <Grid item xs={6}>
                <TextField
                  label="EC경보 하한"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.ec_alarm_low}
                  onChange={(e) => handleNumberChange('ec_alarm_low', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* pH경보 상한 */}
              <Grid item xs={6}>
                <TextField
                  label="pH경보 상한"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.ph_alarm_high}
                  onChange={(e) => handleNumberChange('ph_alarm_high', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* pH경보 하한 */}
              <Grid item xs={6}>
                <TextField
                  label="pH경보 하한"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.ph_alarm_low}
                  onChange={(e) => handleNumberChange('ph_alarm_low', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 작동하한 EC */}
              <Grid item xs={6}>
                <TextField
                  label="작동하한 EC"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.ec_operating_low}
                  onChange={(e) => handleNumberChange('ec_operating_low', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 교반기 시간(초) */}
              <Grid item xs={6}>
                <TextField
                  label="교반기 시간(초)"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 1 }}
                  value={config.stirrer_time_sec}
                  onChange={(e) => handleNumberChange('stirrer_time_sec', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 설정온도(°C) */}
              <Grid item xs={6}>
                <TextField
                  label="설정온도(°C)"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 0.1 }}
                  value={config.set_temperature}
                  onChange={(e) => handleNumberChange('set_temperature', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
              {/* 최소일사량(W/m²) */}
              <Grid item xs={6}>
                <TextField
                  label="최소일사량(W/m²)"
                  type="number"
                  variant="outlined"
                  size="medium"
                  fullWidth
                  inputProps={{ step: 1 }}
                  value={config.min_solar_radiation}
                  onChange={(e) => handleNumberChange('min_solar_radiation', e.target.value)}
                  sx={textFieldSx}
                />
              </Grid>
            </Grid>
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

export default Settings;
