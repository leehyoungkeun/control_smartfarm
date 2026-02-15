/**
 * 배관 흐름도 + 센서값 표시 컴포넌트
 * 상단: SVG 배관도 (원수탱크 → 원수펌프 → 시스템/믹싱 → 관수펌프 → 밸브 14개)
 * 하단: 센서값 6개 그리드 (현재EC, 현재pH, 퇴수EC, 퇴수pH, 1회관수시간, 1회관수유량)
 * 높이 200px, 1024x600 터치패널 대응 컴팩트 레이아웃
 */
import React, { useMemo } from 'react';
import useSystemStore from '../store/systemStore';

/** 점멸 애니메이션 및 파이프 흐름 애니메이션 CSS */
const PIPE_DIAGRAM_STYLES = `
  @keyframes pipeDiagramBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes pipeDiagramFlow {
    to { stroke-dashoffset: -24; }
  }
  .pipe-diagram-blink {
    animation: pipeDiagramBlink 1s ease-in-out infinite;
  }
  .pipe-diagram-flow {
    animation: pipeDiagramFlow 0.8s linear infinite;
  }
`;

/** 밸브 배치 상수 (2행 x 7열) */
const VALVE_START_X = 370;
const VALVE_SPACING = 56;
const VALVE_WIDTH = 40;
const VALVE_HEIGHT = 25;
const VALVE_ROW1_Y = 12;
const VALVE_ROW2_Y = 62;

/**
 * 펌프 원형 아이콘 컴포넌트
 * @param {number} cx - 중심 X좌표
 * @param {number} cy - 중심 Y좌표
 * @param {string} label - 표시 라벨 (P1, P2)
 * @param {boolean} isActive - 동작 상태
 */
const PumpCircle = ({ cx, cy, label, isActive }) => (
  <g>
    <circle
      cx={cx}
      cy={cy}
      r={15}
      fill={isActive ? '#2E75B6' : '#E0E0E0'}
      stroke={isActive ? '#1A5276' : '#999'}
      strokeWidth={1.5}
    />
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={10}
      fontWeight="bold"
      fill={isActive ? '#FFFFFF' : '#666'}
    >
      {label}
    </text>
  </g>
);

/**
 * 밸브 사각형 컴포넌트
 * @param {number} x - X좌표
 * @param {number} y - Y좌표
 * @param {number} number - 밸브 번호 (1~14)
 * @param {boolean} isActive - 동작 상태
 */
const ValveRect = ({ x, y, number, isActive }) => (
  <g>
    <rect
      x={x}
      y={y}
      width={VALVE_WIDTH}
      height={VALVE_HEIGHT}
      rx={3}
      fill={isActive ? '#27AE60' : '#E0E0E0'}
      stroke={isActive ? '#1E8449' : '#BDBDBD'}
      strokeWidth={1}
    />
    <text
      x={x + VALVE_WIDTH / 2}
      y={y + VALVE_HEIGHT / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={9}
      fontWeight="bold"
      fill={isActive ? '#FFFFFF' : '#666'}
    >
      {String(number).padStart(2, '0')}
    </text>
  </g>
);

/**
 * 배관 라인 컴포넌트 (활성 시 흐름 애니메이션)
 * @param {string} d - SVG path 경로
 * @param {boolean} isActive - 활성 상태
 */
const PipeLine = ({ d, isActive }) => (
  <path
    d={d}
    fill="none"
    stroke={isActive ? '#2E75B6' : '#BDBDBD'}
    strokeWidth={isActive ? 3 : 2}
    strokeDasharray={isActive ? '8 4' : 'none'}
    className={isActive ? 'pipe-diagram-flow' : ''}
  />
);

/**
 * 센서값 카드 컴포넌트
 * @param {string} label - 센서 라벨
 * @param {string} value - 표시 값
 * @param {boolean} isAlarm - 경보 상태
 */
const SensorCard = ({ label, value, isAlarm }) => (
  <div style={{
    flex: '1 1 0',
    minWidth: 0,
    textAlign: 'center',
    padding: '4px 2px',
    borderRadius: 4,
    border: isAlarm ? '1px solid #E74C3C' : '1px solid #F0F0F0',
    background: isAlarm ? '#FFF5F5' : '#FAFAFA',
  }}>
    {/* 센서 라벨 */}
    <div style={{
      fontSize: 10,
      color: '#757575',
      lineHeight: 1.2,
      marginBottom: 2,
    }}>
      {label}
    </div>
    {/* 센서 값 */}
    <div
      className={isAlarm ? 'pipe-diagram-blink' : ''}
      style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: isAlarm ? '#E74C3C' : '#212121',
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
  </div>
);

/**
 * 배관 흐름도 메인 컴포넌트
 * Zustand 스토어에서 실시간 상태 읽어서 표시
 */
const PipeDiagram = () => {
  /** 스토어에서 센서 및 상태 데이터 가져오기 */
  const sensors = useSystemStore((s) => s.sensors);
  const status = useSystemStore((s) => s.status);
  const valveStates = useSystemStore((s) => s.valveStates);

  /** 펌프 동작 상태 */
  const drainPumpActive = status?.drain_pump ?? false;
  const irrigationPumpActive = status?.irrigation_pump ?? false;

  /** 배관 활성 여부 (어느 한쪽 펌프라도 동작 중이면 활성) */
  const anyPumpActive = drainPumpActive || irrigationPumpActive;

  /** 센서값 포맷팅 및 경보 판정 */
  const sensorItems = useMemo(() => {
    const currentEc = sensors?.currentEc ?? 0;
    const currentPh = sensors?.currentPh ?? 0;
    const drainEc = sensors?.drainEc ?? 0;
    const drainPh = sensors?.drainPh ?? 0;
    const irrigationTime = sensors?.irrigationTime ?? '00:00';
    const irrigationFlow = sensors?.irrigationFlow ?? 0;

    return [
      {
        label: '현재EC',
        value: `${Number(currentEc).toFixed(1)} mS`,
        /** EC 정상 범위: 0.5 ~ 4.0 (벗어나면 경보) */
        isAlarm: currentEc > 0 && (currentEc < 0.5 || currentEc > 4.0),
      },
      {
        label: '현재pH',
        value: Number(currentPh).toFixed(1),
        /** pH 정상 범위: 4.0 ~ 7.5 */
        isAlarm: currentPh > 0 && (currentPh < 4.0 || currentPh > 7.5),
      },
      {
        label: '퇴수EC',
        value: `${Number(drainEc).toFixed(1)} mS`,
        isAlarm: false,
      },
      {
        label: '퇴수pH',
        value: Number(drainPh).toFixed(1),
        isAlarm: false,
      },
      {
        label: '1회관수시간',
        value: typeof irrigationTime === 'string' ? irrigationTime : '00:00',
        isAlarm: false,
      },
      {
        label: '1회관수유량',
        value: `${Number(irrigationFlow).toFixed(1)} L`,
        isAlarm: false,
      },
    ];
  }, [sensors]);

  return (
    <div style={{
      height: 200,
      background: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* 애니메이션 스타일 삽입 */}
      <style>{PIPE_DIAGRAM_STYLES}</style>

      {/* 상단: SVG 배관도 (~100px) */}
      <div style={{ flex: '0 0 100px', padding: '2px 4px' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* ── 원수탱크 ── */}
          <rect x={10} y={20} width={60} height={60} rx={4}
            fill="#E3F2FD" stroke="#90CAF9" strokeWidth={1} />
          <text x={40} y={50} textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="bold" fill="#1565C0">원수</text>

          {/* 원수탱크 → 원수펌프(P1) 연결 배관 */}
          <PipeLine d="M70,50 L85,50" isActive={drainPumpActive} />

          {/* ── 원수펌프 (P1) ── */}
          <PumpCircle cx={110} cy={50} label="P1" isActive={drainPumpActive} />

          {/* P1 → 시스템 탱크 연결 배관 */}
          <PipeLine d="M125,50 L170,50" isActive={drainPumpActive} />

          {/* ── 시스템/믹싱 탱크 ── */}
          <rect x={170} y={15} width={80} height={70} rx={4}
            fill="#E8F5E9" stroke="#A5D6A7" strokeWidth={1} />
          <text x={210} y={45} textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="bold" fill="#2E7D32">시스템</text>
          <text x={210} y={60} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="#388E3C">믹싱</text>

          {/* 시스템 탱크 → 관수펌프(P2) 연결 배관 */}
          <PipeLine d="M250,50 L285,50" isActive={irrigationPumpActive} />

          {/* ── 관수펌프 (P2) ── */}
          <PumpCircle cx={310} cy={50} label="P2" isActive={irrigationPumpActive} />

          {/* P2 → 밸브 영역 수평 메인 배관 */}
          <PipeLine d="M325,50 L360,50" isActive={irrigationPumpActive} />

          {/* 밸브 영역 수직 분기 배관 (상단 행) */}
          <PipeLine
            d={`M360,50 L360,${VALVE_ROW1_Y + VALVE_HEIGHT / 2} L${VALVE_START_X + 6 * VALVE_SPACING + VALVE_WIDTH},${VALVE_ROW1_Y + VALVE_HEIGHT / 2}`}
            isActive={irrigationPumpActive}
          />

          {/* 밸브 영역 수직 분기 배관 (하단 행) */}
          <PipeLine
            d={`M360,50 L360,${VALVE_ROW2_Y + VALVE_HEIGHT / 2} L${VALVE_START_X + 6 * VALVE_SPACING + VALVE_WIDTH},${VALVE_ROW2_Y + VALVE_HEIGHT / 2}`}
            isActive={irrigationPumpActive}
          />

          {/* 각 밸브로의 수직 분기 라인 (상단 행) */}
          {Array.from({ length: 7 }, (_, i) => {
            const vx = VALVE_START_X + i * VALVE_SPACING;
            const midX = vx + VALVE_WIDTH / 2;
            return (
              <line key={`branch-top-${i}`}
                x1={midX} y1={VALVE_ROW1_Y + VALVE_HEIGHT / 2}
                x2={midX} y2={VALVE_ROW1_Y}
                stroke={valveStates[i] ? '#27AE60' : '#BDBDBD'}
                strokeWidth={valveStates[i] ? 2 : 1}
              />
            );
          })}

          {/* 각 밸브로의 수직 분기 라인 (하단 행) */}
          {Array.from({ length: 7 }, (_, i) => {
            const vx = VALVE_START_X + i * VALVE_SPACING;
            const midX = vx + VALVE_WIDTH / 2;
            return (
              <line key={`branch-bot-${i}`}
                x1={midX} y1={VALVE_ROW2_Y + VALVE_HEIGHT / 2}
                x2={midX} y2={VALVE_ROW2_Y}
                stroke={valveStates[i + 7] ? '#27AE60' : '#BDBDBD'}
                strokeWidth={valveStates[i + 7] ? 2 : 1}
              />
            );
          })}

          {/* ── 밸브 1~7 (상단 행) ── */}
          {Array.from({ length: 7 }, (_, i) => (
            <ValveRect
              key={`valve-${i + 1}`}
              x={VALVE_START_X + i * VALVE_SPACING}
              y={VALVE_ROW1_Y}
              number={i + 1}
              isActive={valveStates[i] ?? false}
            />
          ))}

          {/* ── 밸브 8~14 (하단 행) ── */}
          {Array.from({ length: 7 }, (_, i) => (
            <ValveRect
              key={`valve-${i + 8}`}
              x={VALVE_START_X + i * VALVE_SPACING}
              y={VALVE_ROW2_Y}
              number={i + 8}
              isActive={valveStates[i + 7] ?? false}
            />
          ))}
        </svg>
      </div>

      {/* 하단: 센서값 6개 그리드 (~100px) */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex',
        gap: 6,
        padding: '4px 8px 6px',
        alignItems: 'stretch',
      }}>
        {sensorItems.map((item) => (
          <SensorCard
            key={item.label}
            label={item.label}
            value={item.value}
            isAlarm={item.isAlarm}
          />
        ))}
      </div>
    </div>
  );
};

export default React.memo(PipeDiagram);
