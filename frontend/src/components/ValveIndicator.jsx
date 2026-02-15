/**
 * 밸브 상태 표시 컴포넌트
 * 각 밸브의 동작 상태를 원형 인디케이터로 표시
 * 활성: 녹색 채움, 비활성: 회색 테두리만
 * 1024x600 터치패널 대응 컴팩트 레이아웃
 */
import React from 'react';

/** 색상 상수 */
const COLORS = {
  /** 활성 상태 채움색 (녹색) */
  activeFill: '#27AE60',
  /** 활성 상태 테두리색 */
  activeBorder: '#1E8449',
  /** 비활성 상태 채움색 */
  inactiveFill: '#FFFFFF',
  /** 비활성 상태 테두리색 */
  inactiveBorder: '#E0E0E0',
  /** 활성 상태 텍스트 색상 */
  activeText: '#FFFFFF',
  /** 비활성 상태 텍스트 색상 */
  inactiveText: '#999',
};

/**
 * 밸브 상태 인디케이터 컴포넌트
 * @param {number} number - 밸브 번호 (1~14)
 * @param {boolean} isActive - 동작 상태 (true: 열림/활성, false: 닫힘/비활성)
 * @param {number} size - 원형 인디케이터 크기 (px, 기본값: 24)
 */
const ValveIndicator = ({ number, isActive = false, size = 24 }) => {
  /** 폰트 크기 자동 조절 (크기 비례) */
  const fontSize = Math.max(8, Math.round(size * 0.42));

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
    }}>
      {/* 원형 인디케이터 (SVG) */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* 원형 배경 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1.5}
          fill={isActive ? COLORS.activeFill : COLORS.inactiveFill}
          stroke={isActive ? COLORS.activeBorder : COLORS.inactiveBorder}
          strokeWidth={1.5}
        />

        {/* 밸브 번호 텍스트 */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="bold"
          fill={isActive ? COLORS.activeText : COLORS.inactiveText}
        >
          {number}
        </text>
      </svg>
    </div>
  );
};

export default React.memo(ValveIndicator);
