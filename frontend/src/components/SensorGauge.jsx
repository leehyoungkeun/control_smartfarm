/**
 * 센서 게이지 컴포넌트
 * 개별 센서값을 라벨 + 값 + 단위 + 범위 바 형태로 표시
 * 경보 상태 시 빨간색 점멸 애니메이션 적용
 * 1024x600 터치패널 대응 컴팩트 레이아웃
 */
import React, { useMemo } from 'react';

/** 점멸 애니메이션 CSS (경보 시 사용) */
const SENSOR_GAUGE_STYLES = `
  @keyframes sensorGaugeBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .sensor-gauge-blink {
    animation: sensorGaugeBlink 1s ease-in-out infinite;
  }
`;

/** 스타일 상수 */
const COLORS = {
  /** 정상 상태 값 색상 */
  normalValue: '#212121',
  /** 경보 상태 값 색상 */
  alarmValue: '#E74C3C',
  /** 라벨/단위 색상 */
  label: '#757575',
  /** 정상 테두리 */
  normalBorder: '#E0E0E0',
  /** 경보 테두리 */
  alarmBorder: '#E74C3C',
  /** 범위 바 배경색 */
  barBackground: '#F0F0F0',
  /** 범위 바 채움색 (정상) */
  barFillNormal: '#2E75B6',
  /** 범위 바 채움색 (경보) */
  barFillAlarm: '#E74C3C',
};

/**
 * 센서 게이지 메인 컴포넌트
 * @param {string} label - 센서 라벨 (예: "현재EC", "실내온도")
 * @param {number} value - 센서 값
 * @param {string} unit - 단위 (예: "mS", "°C")
 * @param {number} min - 범위 최소값 (범위 바 표시용)
 * @param {number} max - 범위 최대값 (범위 바 표시용)
 * @param {number} precision - 소수점 자릿수 (기본값: 1)
 * @param {boolean} isAlarm - 경보 상태 여부
 */
const SensorGauge = ({
  label,
  value,
  unit,
  min,
  max,
  precision = 1,
  isAlarm = false,
}) => {
  /** 범위 바 표시 여부 (min, max 모두 전달된 경우만) */
  const showBar = min !== undefined && max !== undefined;

  /** 범위 바 채움 비율 계산 (0~100%) */
  const barPercent = useMemo(() => {
    if (!showBar || max === min) return 0;
    const clamped = Math.max(min, Math.min(max, value ?? 0));
    return ((clamped - min) / (max - min)) * 100;
  }, [value, min, max, showBar]);

  /** 표시 값 포맷팅 */
  const displayValue = value !== null && value !== undefined
    ? Number(value).toFixed(precision)
    : '-';

  return (
    <div style={{
      border: `1px solid ${isAlarm ? COLORS.alarmBorder : COLORS.normalBorder}`,
      borderRadius: 8,
      padding: 8,
      minWidth: 80,
      textAlign: 'center',
      background: '#FFFFFF',
      boxSizing: 'border-box',
      /** 경보 시 배경 약간 붉게 */
      ...(isAlarm && { background: '#FFF8F8' }),
    }}>
      {/* 애니메이션 스타일 (경보 시에만 삽입) */}
      {isAlarm && <style>{SENSOR_GAUGE_STYLES}</style>}

      {/* 센서 라벨 */}
      <div style={{
        fontSize: 10,
        color: COLORS.label,
        lineHeight: 1.2,
        marginBottom: 2,
      }}>
        {label}
      </div>

      {/* 센서 값 + 단위 */}
      <div
        className={isAlarm ? 'sensor-gauge-blink' : ''}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {/* 값 */}
        <span style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: isAlarm ? COLORS.alarmValue : COLORS.normalValue,
          lineHeight: 1.2,
        }}>
          {displayValue}
        </span>

        {/* 단위 */}
        {unit && (
          <span style={{
            fontSize: 12,
            color: COLORS.label,
          }}>
            {unit}
          </span>
        )}
      </div>

      {/* 범위 바 (min/max 지정 시만 표시) */}
      {showBar && (
        <div style={{
          marginTop: 4,
          height: 4,
          background: COLORS.barBackground,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          {/* 채움 바 */}
          <div style={{
            width: `${barPercent}%`,
            height: '100%',
            background: isAlarm ? COLORS.barFillAlarm : COLORS.barFillNormal,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </div>
  );
};

export default React.memo(SensorGauge);
