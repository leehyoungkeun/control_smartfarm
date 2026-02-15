/**
 * 대시보드 페이지
 * 7인치 터치패널(1024x600px)에 스크롤 없이 모든 정보를 표시하는 메인 화면
 *
 * 전체 레이아웃:
 * ┌──────────────────────────────────────────────┐
 * │ AlarmBanner (경보 시에만 표시, 28px)           │
 * │ Header (36px)                                │
 * ├────────┬─────────────────────────────────────┤
 * │StatusPanel│ TankVisualizer (80px)              │
 * │(180px)   │ PipeDiagram + SensorValues (200px)  │
 * │          │ SolarRadiationTable (110px)          │
 * ├────────┴─────────────────────────────────────┤
 * │ ControlButtons (50px)                        │
 * └──────────────────────────────────────────────┘
 *
 * 높이 계산 (경보 없을 때):
 *   - Header: 36px
 *   - 메인 콘텐츠 패딩: 상4px + 하4px = 8px
 *   - 메인 콘텐츠 영역: ~498px (flex: 1로 남은 공간 차지)
 *   - 하단 제어 버튼: 50px + 하단 패딩 4px = 54px
 *   - 합계: 36 + 8 + ~498 + 54 ≈ 596px (여유분 포함 600px 이내)
 *
 * 반응형 동작:
 *   - 터치패널 (1024x600): 스크롤 없음, 고정 레이아웃
 *   - 데스크탑 (>1024px): 동일 레이아웃, 중앙 정렬
 *   - 모바일 (<768px): StatusPanel이 상단으로 이동, 세로 스크롤 허용
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import useConnectionMode from '../../hooks/useConnectionMode';
import useRealtimeData from '../../hooks/useRealtimeData';
import useSystemStore from '../../store/systemStore';
import Header from '../../components/Header';
import StatusPanel from '../../components/StatusPanel';
import TankVisualizer from '../../components/TankVisualizer';
import PipeDiagram from '../../components/PipeDiagram';
import SolarRadiationTable from '../../components/SolarRadiationTable';
import EmergencyButton from '../../components/EmergencyButton';
import AlarmBanner from '../../components/AlarmBanner';

/**
 * Dashboard 컴포넌트
 * 스마트팜 시스템의 메인 대시보드 페이지
 * 모든 센서 데이터, 탱크 수위, 배관 상태, 일사량 정보를 한 화면에 표시
 */
const Dashboard = () => {
  // --- 접속 모드 판별 ---
  // 로컬 모드: farmId 불필요 (터치패널에서 직접 접속)
  // 원격 모드: URL 파라미터에서 farmId 추출
  const { isLocal } = useConnectionMode();
  const params = useParams();
  const farmId = isLocal ? null : params.farmId;

  // --- 실시간 데이터 웹소켓 연결 ---
  // farmId에 따라 적절한 웹소켓 채널에 자동 연결
  useRealtimeData(farmId);

  // --- 전역 상태에서 데이터 조회 ---
  const status = useSystemStore((state) => state.status);           // 시스템 상태
  const sensors = useSystemStore((state) => state.sensors);         // 센서 데이터
  const tankLevels = useSystemStore((state) => state.tankLevels);   // 탱크 수위
  const solarTable = useSystemStore((state) => state.solarTable);   // 일사량 테이블
  const valveStates = useSystemStore((state) => state.valveStates); // 밸브 상태

  // --- 농장 이름 설정 ---
  // 로컬 모드: 하드코딩 (추후 설정 파일에서 읽어오도록 변경 예정)
  // 원격 모드: 스토어 또는 API에서 가져올 수 있으나, 현재는 기본값 사용
  const farmName = '(주)흥농팜온실';

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',       // 7인치 패널에서 스크롤 방지
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F5F5F5', // 라이트 테마 배경색
      }}
    >
      {/* ── 경보 배너 ── */}
      {/* 경보 발생 시에만 표시되며, 높이 28px 차지 */}
      <AlarmBanner />

      {/* ── 헤더 영역 (36px) ── */}
      <Header farmName={farmName} farmId={farmId} />

      {/* ── 메인 콘텐츠 영역 ── */}
      {/* flex: 1로 헤더와 하단 버튼을 제외한 나머지 높이 전체를 차지 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          gap: '4px',
          p: '4px',
        }}
      >
        {/* ── 좌측 상태 패널 (180px) ── */}
        {/* 시스템 상태, 센서값, 밸브 상태 등 주요 지표 세로 배치 */}
        <StatusPanel />

        {/* ── 중앙 + 우측 콘텐츠 영역 ── */}
        {/* 나머지 가로 공간을 차지하며, 세로로 3개 섹션 분할 */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden',
          }}
        >
          {/* ── 탱크 시각화 (80px) ── */}
          {/* 양액탱크, 배액탱크 등의 수위를 시각적으로 표시 */}
          <TankVisualizer tankLevels={tankLevels} />

          {/* ── 배관 흐름도 + 센서 값 (200px) ── */}
          {/* 배관 다이어그램 위에 실시간 센서 데이터 오버레이 */}
          <PipeDiagram />

          {/* ── 일사량 테이블 (남은 공간 전체 사용) ── */}
          {/* flex: 1로 남은 세로 공간을 모두 차지하여 레이아웃 완성 */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <SolarRadiationTable
              solarTable={solarTable}
              currentProgram={status?.current_program || 0}
            />
          </Box>
        </Box>
      </Box>

      {/* ── 하단 제어 버튼 영역 (50px) ── */}
      {/* 비상정지 등 긴급 제어 버튼 배치 */}
      <Box
        sx={{
          height: 50,
          flexShrink: 0,  // 다른 요소에 의해 축소되지 않도록 고정
          px: '4px',
          pb: '4px',
        }}
      >
        <EmergencyButton farmId={farmId} />
      </Box>
    </Box>
  );
};

export default Dashboard;
