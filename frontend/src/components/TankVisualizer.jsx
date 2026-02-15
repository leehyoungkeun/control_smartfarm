/**
 * 양액 탱크 시각화 컴포넌트
 * A~F + Acid(H) 총 7개 탱크를 가로 배치
 * 각 탱크는 SVG 사다리꼴 형태로 잔량을 시각적으로 표현
 * 높이 80px, 1024x600 터치패널 대응 컴팩트 레이아웃
 */
import React, { useMemo } from 'react';

/** 탱크 라벨 목록 (A~F + 산탱크 H) */
const TANK_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'H'];

/** 탱크 종류별 채움 색상 (A~F: 파란색, H(Acid): 녹색) */
const TANK_COLORS = {
  default: '#2E75B6',  // 양액 탱크 (A~F)
  acid: '#27AE60',     // 산 탱크 (H)
};

/**
 * 사다리꼴 탱크 클립패스 좌표
 * 상단이 넓고 하단이 좁은 형태
 */
const TRAPEZOID_PATH = 'M5,0 L45,0 L40,50 L10,50 Z';

/**
 * 개별 탱크 SVG 렌더링 컴포넌트
 * @param {string} label - 탱크 라벨 (A~F, H)
 * @param {number} level - 잔량 퍼센트 (0~100)
 * @param {number} index - 탱크 인덱스 (색상 결정용)
 */
const SingleTank = React.memo(({ label, level, index }) => {
  /** 0~100 범위로 클램핑 */
  const clampedLevel = Math.max(0, Math.min(100, level));

  /** 채움 색상 결정: 마지막(H)은 녹색, 나머지는 파란색 */
  const fillColor = index === 6 ? TANK_COLORS.acid : TANK_COLORS.default;

  /** 채움 높이 계산 (하단에서 위로 채워짐) */
  const fillHeight = (clampedLevel / 100) * 50;
  const fillY = 50 - fillHeight;

  /** 클립패스 고유 ID */
  const clipId = `tank-clip-${index}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: 55,
    }}>
      {/* 탱크 SVG */}
      <svg width={50} height={55} viewBox="0 0 50 55">
        <defs>
          {/* 사다리꼴 클립 영역 정의 */}
          <clipPath id={clipId}>
            <path d={TRAPEZOID_PATH} />
          </clipPath>
        </defs>

        {/* 잔량 채움 영역 (클립패스 적용) */}
        <rect
          x={0}
          y={fillY}
          width={50}
          height={fillHeight}
          fill={fillColor}
          opacity={0.7}
          clipPath={`url(#${clipId})`}
        />

        {/* 탱크 외곽선 */}
        <path
          d={TRAPEZOID_PATH}
          fill="none"
          stroke="#999"
          strokeWidth={1.5}
        />

        {/* 잔량 퍼센트 텍스트 (탱크 내부) */}
        <text
          x={25}
          y={30}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight="bold"
          fill={clampedLevel > 30 ? '#FFFFFF' : '#333'}
        >
          {clampedLevel}%
        </text>
      </svg>

      {/* 탱크 라벨 (하단) */}
      <span style={{
        fontSize: 10,
        color: '#555',
        fontWeight: 'bold',
        marginTop: 1,
        lineHeight: 1,
      }}>
        {label}
      </span>
    </div>
  );
});

SingleTank.displayName = 'SingleTank';

/**
 * 탱크 시각화 메인 컴포넌트
 * @param {number[]} tankLevels - 7개 탱크 잔량 배열 (0~100)
 */
const TankVisualizer = ({ tankLevels = [0, 0, 0, 0, 0, 0, 0] }) => {
  /** 탱크 데이터 메모이제이션 */
  const tanks = useMemo(() =>
    TANK_LABELS.map((label, i) => ({
      label,
      level: tankLevels[i] ?? 0,
    })),
    [tankLevels]
  );

  return (
    <div style={{
      height: 80,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      background: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: 8,
      padding: '4px 8px',
      boxSizing: 'border-box',
    }}>
      {tanks.map((tank, index) => (
        <SingleTank
          key={tank.label}
          label={tank.label}
          level={tank.level}
          index={index}
        />
      ))}
    </div>
  );
};

export default React.memo(TankVisualizer);
