/**
 * 일사량 테이블 컴포넌트
 * 6개 프로그램(P1~P6)의 설정값/적산값 표시
 * 현재 활성 프로그램 컬럼 강조
 * 높이 110px, 1024x600 터치패널 대응 컴팩트 레이아웃
 */
import React from 'react';

/** 프로그램 라벨 목록 */
const PROGRAM_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

/** 테이블 스타일 상수 */
const STYLES = {
  /** 헤더 행 배경색 */
  headerBg: '#2E75B6',
  /** 헤더 글자색 */
  headerColor: '#FFFFFF',
  /** 활성 프로그램 강조 배경색 */
  activeBg: '#E3F2FD',
  /** 짝수 행 배경색 */
  altRowBg: '#F5F5F5',
};

/**
 * 일사량 테이블 메인 컴포넌트
 * @param {Array<{setting: number, accumulated: number}>} solarTable - 프로그램별 설정/적산 데이터
 * @param {number} currentProgram - 현재 활성 프로그램 인덱스 (0~5)
 */
const SolarRadiationTable = ({ solarTable = [], currentProgram = 0 }) => {
  /** 공통 셀 스타일 */
  const cellStyle = {
    fontSize: 12,
    padding: '4px',
    textAlign: 'center',
    borderRight: '1px solid #E0E0E0',
  };

  /** 헤더 셀 스타일 */
  const headerCellStyle = {
    ...cellStyle,
    fontSize: 11,
    fontWeight: 'bold',
    background: STYLES.headerBg,
    color: STYLES.headerColor,
    borderRight: '1px solid rgba(255,255,255,0.3)',
  };

  /**
   * 프로그램 컬럼의 배경색 결정
   * @param {number} index - 프로그램 인덱스
   * @param {boolean} isAltRow - 짝수 행 여부
   * @returns {string} 배경색 CSS 값
   */
  const getCellBg = (index, isAltRow) => {
    if (index === currentProgram) return STYLES.activeBg;
    if (isAltRow) return STYLES.altRowBg;
    return '#FFFFFF';
  };

  return (
    <div style={{
      height: 110,
      background: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: 8,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
      }}>
        <thead>
          {/* 헤더 행: 구분 | P1~P6 */}
          <tr>
            <th style={{
              ...headerCellStyle,
              width: '15%',
            }}>
              구분
            </th>
            {PROGRAM_LABELS.map((label, i) => (
              <th key={label} style={{
                ...headerCellStyle,
                /* 활성 프로그램 헤더도 약간 구분 */
                background: i === currentProgram ? '#1A5276' : STYLES.headerBg,
              }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 설정값 행 */}
          <tr>
            <td style={{
              ...cellStyle,
              fontWeight: 'bold',
              background: '#FAFAFA',
              color: '#555',
            }}>
              설정
            </td>
            {PROGRAM_LABELS.map((_, i) => (
              <td key={`setting-${i}`} style={{
                ...cellStyle,
                background: getCellBg(i, false),
                fontWeight: i === currentProgram ? 'bold' : 'normal',
                color: i === currentProgram ? '#1565C0' : '#212121',
              }}>
                {solarTable[i]?.setting ?? 0}
              </td>
            ))}
          </tr>

          {/* 적산값 행 */}
          <tr>
            <td style={{
              ...cellStyle,
              fontWeight: 'bold',
              background: '#FAFAFA',
              color: '#555',
            }}>
              적산
            </td>
            {PROGRAM_LABELS.map((_, i) => (
              <td key={`accumulated-${i}`} style={{
                ...cellStyle,
                background: getCellBg(i, true),
                fontWeight: i === currentProgram ? 'bold' : 'normal',
                color: i === currentProgram ? '#1565C0' : '#212121',
              }}>
                {solarTable[i]?.accumulated ?? 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(SolarRadiationTable);
