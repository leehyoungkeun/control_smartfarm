/**
 * 수동 조작 페이지
 * 밸브, 펌프, 교반기 수동 제어
 *
 * 구조:
 * - 상단 경고 배너: 수동 조작 모드 안내
 * - 밸브 제어 카드: V01~V14 토글 버튼 (2열 × 7행 그리드)
 * - 장비 제어 카드: 원수공급펌프, 관수공급펌프, 양액교반기
 * - 하단: 닫기 버튼
 *
 * 각 토글 버튼은 ON/OFF 상태를 전환하며
 * POST /api/control/manual 엔드포인트로 제어 명령 전송
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import useConnectionMode from '../../hooks/useConnectionMode';
import useApi from '../../hooks/useApi';

/**
 * 밸브 ON 상태 스타일
 * 초록색 배경, 흰색 텍스트
 */
const VALVE_ON_STYLE = {
  backgroundColor: '#27AE60',
  color: '#FFFFFF',
  '&:hover': { backgroundColor: '#219A52' },
};

/**
 * 밸브 OFF 상태 스타일
 * 연한 회색 배경, 어두운 텍스트
 */
const VALVE_OFF_STYLE = {
  backgroundColor: '#E0E0E0',
  color: '#424242',
  '&:hover': { backgroundColor: '#BDBDBD' },
};

const ManualControl = () => {
  const navigate = useNavigate();
  const mode = useConnectionMode();
  const params = useParams();
  const farmId = mode === 'local' ? null : params.farmId;
  const api = useApi();

  // --- 밸브 상태 관리 (V01~V14, 기본값 모두 OFF) ---
  const [valveStates, setValveStates] = useState(() => {
    const states = {};
    for (let i = 1; i <= 14; i++) {
      states[i] = false; // false = OFF, true = ON
    }
    return states;
  });

  // --- 장비 상태 관리 ---
  const [equipmentStates, setEquipmentStates] = useState({
    rawWaterPump: false,    // 원수공급펌프
    irrigationPump: false,  // 관수공급펌프
    mixer: false,           // 양액교반기
  });

  /**
   * 접속 모드에 따라 제어 API 경로 결정
   */
  const getControlPath = useCallback(() => {
    if (mode === 'remote' && farmId) {
      return `/farms/${farmId}/control/manual`;
    }
    return '/control/manual';
  }, [mode, farmId]);

  /**
   * 밸브 토글 처리
   * @param {number} valveNumber - 밸브 번호 (1~14)
   */
  const handleValveToggle = async (valveNumber) => {
    const currentState = valveStates[valveNumber];
    const newState = !currentState;

    try {
      await api.post(getControlPath(), {
        action: newState ? 'valve_on' : 'valve_off',
        valveNumber,
      });

      // API 성공 시 상태 업데이트
      setValveStates((prev) => ({
        ...prev,
        [valveNumber]: newState,
      }));
    } catch (err) {
      console.error(`밸브 V${String(valveNumber).padStart(2, '0')} 제어 실패:`, err);
    }
  };

  /**
   * 장비 토글 처리
   * @param {string} equipmentKey - 장비 키 (rawWaterPump, irrigationPump, mixer)
   * @param {string} actionOn - ON 시 전송할 action 문자열
   * @param {string} actionOff - OFF 시 전송할 action 문자열
   */
  const handleEquipmentToggle = async (equipmentKey, actionOn, actionOff) => {
    const currentState = equipmentStates[equipmentKey];
    const newState = !currentState;

    try {
      await api.post(getControlPath(), {
        action: newState ? actionOn : actionOff,
      });

      // API 성공 시 상태 업데이트
      setEquipmentStates((prev) => ({
        ...prev,
        [equipmentKey]: newState,
      }));
    } catch (err) {
      console.error(`장비(${equipmentKey}) 제어 실패:`, err);
    }
  };

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

  // 밸브 번호 배열 (1~14)
  const valveNumbers = Array.from({ length: 14 }, (_, i) => i + 1);

  // 장비 목록 정의
  const equipmentList = [
    {
      key: 'rawWaterPump',
      label: '원수공급펌프',
      actionOn: 'pump_on',
      actionOff: 'pump_off',
    },
    {
      key: 'irrigationPump',
      label: '관수공급펌프',
      actionOn: 'pump_on',
      actionOff: 'pump_off',
    },
    {
      key: 'mixer',
      label: '양액교반기',
      actionOn: 'pump_on',
      actionOff: 'pump_off',
    },
  ];

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
      {/* ── 경고 배너: 수동 조작 모드 안내 ── */}
      <Box
        sx={{
          backgroundColor: '#FFF8E1',
          borderBottom: '1px solid #FFE082',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 'bold', color: '#F57F17' }}>
          ⚠️ 수동 조작 모드입니다. 주의하여 사용하세요.
        </Typography>
      </Box>

      {/* ── 콘텐츠 영역 (스크롤 가능) ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* ── 밸브 제어 카드 ── */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography sx={{ fontSize: 15, fontWeight: 'bold', mb: 1.5, color: '#212121' }}>
              밸브 제어
            </Typography>

            {/* 2열 × 7행 그리드 레이아웃 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
              }}
            >
              {valveNumbers.map((num) => {
                const isOn = valveStates[num];
                const valveLabel = `V${String(num).padStart(2, '0')}`;
                return (
                  <Button
                    key={num}
                    variant="contained"
                    onClick={() => handleValveToggle(num)}
                    sx={{
                      height: 48,
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: 14,
                      boxShadow: 'none',
                      ...(isOn ? VALVE_ON_STYLE : VALVE_OFF_STYLE),
                    }}
                  >
                    {valveLabel} {isOn ? 'ON' : 'OFF'}
                  </Button>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* ── 장비 제어 카드 ── */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography sx={{ fontSize: 15, fontWeight: 'bold', mb: 1.5, color: '#212121' }}>
              장비 제어
            </Typography>

            {/* 1열 레이아웃 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {equipmentList.map((equipment) => {
                const isOn = equipmentStates[equipment.key];
                return (
                  <Button
                    key={equipment.key}
                    variant="contained"
                    onClick={() =>
                      handleEquipmentToggle(
                        equipment.key,
                        equipment.actionOn,
                        equipment.actionOff
                      )
                    }
                    sx={{
                      height: 48,
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: 14,
                      boxShadow: 'none',
                      ...(isOn ? VALVE_ON_STYLE : VALVE_OFF_STYLE),
                    }}
                  >
                    {equipment.label} {isOn ? 'ON' : 'OFF'}
                  </Button>
                );
              })}
            </Box>
          </CardContent>
        </Card>
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

export default ManualControl;
